import type { Express, Request, Response } from "express";
import { db } from "../db";
import { documents, users } from "@db/schema";
import { eq, desc } from "drizzle-orm";
import { createUser, loginUser, verifyToken } from "./lib/auth";
import multer from "multer";
import { streamChatResponse } from "./lib/openai";
import chatRouter from "./routes/chat";
import { AuthRequest } from "./middleware/auth";

const authMiddleware = async (req: AuthRequest, res: Response, next: Function) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ error: "No token provided" });

    const { userId } = verifyToken(token);
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });
    if (!user) throw new Error("User not found");

    req.user = { id: user.id };
    next();
  } catch (error) {
    res.status(401).json({ error: "Unauthorized" });
  }
};

// Configure multer for file uploads
const upload = multer({
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  }
});

export function registerRoutes(app: Express) {
  // Add the chat router
  app.use("/api/chat", chatRouter);

  // Auth routes
  app.post("/api/auth/signup", async (req: Request, res: Response) => {
    try {
      const { email, password, name } = req.body;
      const user = await createUser(email, password, name);
      const response = await loginUser(email, password);
      res.json(response);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Signup failed" });
    }
  });

  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;
      const response = await loginUser(email, password);
      res.json(response);
    } catch (error) {
      res.status(401).json({ error: error instanceof Error ? error.message : "Login failed" });
    }
  });

  // Document routes
  app.post("/api/documents", authMiddleware, upload.single("file"), 
    async (req: AuthRequest & { file?: Express.Multer.File }, res: Response) => {
      try {
        if (!req.file || !req.user) {
          return res.status(400).json({ 
            error: !req.file ? "No file uploaded" : "Unauthorized" 
          });
        }

        console.log("File received:", {
          originalname: req.file.originalname,
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

        res.json(document);
      } catch (error) {
        console.error("Upload error:", error);
        res.status(500).json({ 
          error: error instanceof Error ? error.message : "Upload failed" 
        });
      }
    }
  );

  app.get("/api/documents", authMiddleware, 
    async (req: AuthRequest, res: Response) => {
      try {
        if (!req.user) throw new Error("Unauthorized");
        
        const docs = await db.query.documents.findMany({
          where: eq(documents.user_id, req.user.id),
          orderBy: desc(documents.created_at),
        });
        res.json(docs);
      } catch (error) {
        res.status(500).json({ error: "Failed to fetch documents" });
      }
    }
  );

  // Add chat endpoint
  app.post("/api/documents/:id/chat", authMiddleware,
    async (req: AuthRequest, res: Response) => {
      try {
        const { id } = req.params;
        const { message } = req.body;

        if (!req.user) throw new Error("Unauthorized");

        // Fetch the document
        const [document] = await db.query.documents.findMany({
          where: eq(documents.id, Number(id)),
          limit: 1,
        });

        if (!document) {
          return res.status(404).json({ error: "Document not found" });
        }

        // Get content from base64
        const content = Buffer.from(document.content, 'base64').toString();
        
        // Set headers for streaming
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        // Stream the response
        for await (const chunk of streamChatResponse(message, [{
          id: document.id,
          content: content
        }])) {
          res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
        }

        res.write('data: [DONE]\n\n');
        res.end();
      } catch (error) {
        console.error("Chat error:", error);
        res.status(500).json({ 
          error: error instanceof Error ? error.message : "Failed to get response" 
        });
      }
    }
  );

  // Add single document fetch endpoint
  app.get("/api/documents/:id", authMiddleware,
    async (req: AuthRequest, res: Response) => {
      try {
        const { id } = req.params;
        if (!req.user) throw new Error("Unauthorized");

        const [document] = await db.query.documents.findMany({
          where: eq(documents.id, Number(id)),
          limit: 1,
        });

        if (!document) {
          return res.status(404).json({ error: "Document not found" });
        }

        res.json(document);
      } catch (error) {
        res.status(500).json({ error: "Failed to fetch document" });
      }
    }
  );

  // Add this to your existing routes
  app.get("/api/auth/me", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      // Get user data without password
      const [user] = await db.query.users.findMany({
        where: eq(users.id, req.user.id),
        columns: {
          id: true,
          email: true,
          name: true,
        },
        limit: 1,
      });

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.delete("/api/documents/:id", authMiddleware, 
    async (req: AuthRequest, res: Response) => {
      try {
        const { id } = req.params;
        if (!req.user) throw new Error("Unauthorized");

        // Check if document exists and belongs to user
        const [document] = await db.query.documents.findMany({
          where: eq(documents.id, parseInt(id)),
          limit: 1,
        });

        if (!document) {
          return res.status(404).json({ error: "Document not found" });
        }

        if (document.user_id !== req.user.id) {
          return res.status(403).json({ error: "Not authorized to delete this document" });
        }

        // Delete the document
        await db.delete(documents)
          .where(eq(documents.id, parseInt(id)));

        res.json({ message: "Document deleted successfully" });
      } catch (error) {
        console.error("Delete error:", error);
        res.status(500).json({ error: "Failed to delete document" });
      }
    }
  );
}
