import { Router } from "express";
import multer from "multer";
import { db } from "../../db/index.js";
import { documents } from "../../db/schema.js";
import { eq, and } from "drizzle-orm";
import { AuthRequest } from "../middleware/auth.js";

const router = Router();

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = [
      'text/plain',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    
    console.log(`Validating file upload: ${file.originalname} (${file.mimetype})`);
    
    if (allowedTypes.includes(file.mimetype)) {
      console.log(`File type ${file.mimetype} is allowed`);
      cb(null, true);
    } else {
      console.log(`Rejected file type: ${file.mimetype}`);
      cb(new Error(`Invalid file type: ${file.mimetype}. Please upload a PDF, DOC, or TXT file.`));
    }
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

    upload.single('file')(req, res, async (err) => {
      if (err instanceof multer.MulterError) {
        return res.status(400).json({ 
          error: err.code === 'LIMIT_FILE_SIZE' 
            ? 'File size exceeds 10MB limit'
            : err.message
        });
      } else if (err) {
        return res.status(400).json({ error: err.message });
      }

      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      try {
        // Process file content based on type
        let fileContent = '';
        if (req.file.mimetype === 'text/plain') {
          fileContent = req.file.buffer.toString('utf-8');
        } else {
          // For non-text files, store as base64
          fileContent = req.file.buffer.toString('base64');
        }

        // Generate a unique file identifier
        const fileUrl = `document-${Date.now()}-${req.file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
        
        // Save document to database
        const [document] = await db.insert(documents)
          .values({
            title: req.body.title || req.file.originalname,
            content: fileContent,
            file_type: req.file.mimetype,
            file_url: fileUrl,
            user_id: userId,
          })
          .returning();

        res.status(201).json(document);
      } catch (dbError) {
        console.error("Database error:", dbError);
        res.status(500).json({ error: "Failed to save document to database" });
      }
    });
  } catch (error) {
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