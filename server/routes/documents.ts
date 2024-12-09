import { Router } from "express";
import multer from "multer";
import { db } from "../../db/index.js";
import { documents } from "../../db/schema.js";
import { eq, and } from "drizzle-orm";
import { AuthRequest } from "../middleware/auth.js";

const router = Router();

// Configure multer for memory storage
const ALLOWED_FILE_TYPES = {
  'text/plain': '.txt',
  'application/pdf': '.pdf',
  'application/msword': '.doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx'
};

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB limit

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1 // Only allow one file per request
  },
  fileFilter: (_req, file, cb) => {
    const extension = ALLOWED_FILE_TYPES[file.mimetype as keyof typeof ALLOWED_FILE_TYPES];
    
    if (!extension) {
      cb(new Error(`Invalid file type: ${file.mimetype}. Allowed types: ${Object.values(ALLOWED_FILE_TYPES).join(', ')}`));
      return;
    }

    // Validate file extension matches mimetype
    const fileExtension = file.originalname.toLowerCase().split('.').pop();
    if (fileExtension !== extension.substring(1)) {
      cb(new Error(`File extension doesn't match the file type. Expected ${extension} for ${file.mimetype}`));
      return;
    }

    cb(null, true);
  }
}).single('file');

// Get all documents for the authenticated user
router.get("/", async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const userDocuments = await db.select()
      .from(documents)
      .where(eq(documents.user_id, userId));

    res.json(userDocuments);
  } catch (error) {
    console.error("Error fetching documents:", error);
    res.status(500).json({ error: "Failed to fetch documents" });
  }
});

// Upload a document
router.post("/", async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Wrap multer upload in a promise
    await new Promise<void>((resolve, reject) => {
      upload(req, res, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    // Validate file size again (double check)
    if (req.file.size > MAX_FILE_SIZE) {
      return res.status(400).json({ 
        error: `File size (${(req.file.size / (1024 * 1024)).toFixed(2)}MB) exceeds ${MAX_FILE_SIZE / (1024 * 1024)}MB limit` 
      });
    }

    // Process file content based on type
    let fileContent = '';
    if (req.file.mimetype === 'text/plain') {
      // For text files, validate UTF-8 encoding
      try {
        fileContent = req.file.buffer.toString('utf-8');
        if (fileContent.length === 0) {
          throw new Error('Empty file');
        }
      } catch (error) {
        return res.status(400).json({ error: 'Invalid text file encoding' });
      }
    } else {
      // For non-text files, store as base64
      fileContent = req.file.buffer.toString('base64');
    }

    // Generate a sanitized file identifier
    const timestamp = Date.now();
    const sanitizedFileName = req.file.originalname
      .replace(/[^a-zA-Z0-9.-]/g, '_')
      .toLowerCase();
    const fileUrl = `document-${timestamp}-${sanitizedFileName}`;
    
    // Save document to database with proper error handling
    const [document] = await db.insert(documents)
      .values({
        title: req.body.title?.trim() || sanitizedFileName.replace(/\.[^/.]+$/, ""),
        content: fileContent,
        file_type: req.file.mimetype,
        file_url: fileUrl,
        user_id: userId,
      })
      .returning();

    // Log successful upload
    console.log(`Document uploaded successfully: ${document.id} by user ${userId}`);
    
    res.status(201).json({
      id: document.id,
      title: document.title,
      file_type: document.file_type,
      created_at: document.created_at
    });

  } catch (error) {
    if (error instanceof multer.MulterError) {
      return res.status(400).json({ 
        error: error.code === 'LIMIT_FILE_SIZE' 
          ? `File size exceeds ${MAX_FILE_SIZE / (1024 * 1024)}MB limit`
          : error.message
      });
    }

    console.error("Error handling upload:", error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : "Failed to process upload request" 
    });
  }
});

// Delete a document
router.delete("/:id", async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;
    const documentId = parseInt(req.params.id);

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Only allow deletion of user's own documents
    await db.delete(documents)
      .where(and(
        eq(documents.id, documentId),
        eq(documents.user_id, userId)
      ));

    res.json({ message: "Document deleted successfully" });
  } catch (error) {
    console.error("Error deleting document:", error);
    res.status(500).json({ error: "Failed to delete document" });
  }
});

export default router;