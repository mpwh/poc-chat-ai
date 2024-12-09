import { Router } from "express";
import multer from "multer";
import { db } from "../../db";
import { documents } from "@db/schema";
import { eq, and } from "drizzle-orm";
import { AuthRequest } from "../middleware/auth";

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
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Please upload a PDF, DOC, or TXT file.'));
    }
  }
});

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
router.post("/", upload.single('file'), async (req: AuthRequest, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Log upload attempt
    console.log("File upload attempt:", {
      filename: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size
    });
    
    // Read and process file content
    let fileContent = '';
    if (req.file.mimetype === 'text/plain') {
      fileContent = req.file.buffer.toString('utf-8');
    } else {
      // For other file types, store as base64
      fileContent = req.file.buffer.toString('base64');
    }

    // Generate a unique file identifier
    const fileUrl = `document-${Date.now()}-${req.file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    
    const [document] = await db.insert(documents)
      .values({
        title: req.body.title || req.file.originalname,
        content: fileContent,
        file_type: req.file.mimetype,
        file_url: fileUrl,
        user_id: req.user.id,
      })
      .returning();

    res.status(201).json(document);
  } catch (error) {
    console.error("Error uploading document:", error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : "Failed to upload document" 
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