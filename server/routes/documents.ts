import { Router } from "express";
import { db } from "../../db";
import { documents } from "@db/schema";
import multer from "multer";
import { authenticateToken, AuthRequest } from "../middleware/auth";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post("/", authenticateToken, upload.single("file"), async (req: AuthRequest, res) => {
  try {
    if (!req.file || !req.user) {
      return res.status(400).json({ error: "No file uploaded or user not authenticated" });
    }

    const { originalname, buffer } = req.file;
    const content = buffer.toString("base64");

    // Save document to database only
    const [document] = await db.insert(documents).values({
      title: originalname,
      content: content,
      file_type: req.file.mimetype,
      user_id: req.user.id
    }).returning();

    res.json(document);
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({ error: "Failed to upload document" });
  }
});

export default router; 