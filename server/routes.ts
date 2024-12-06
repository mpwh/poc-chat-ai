import type { Express, Request } from "express";
import { db } from "../db";
import { documents, chats, messages } from "@db/schema";
import { eq, and } from "drizzle-orm";
import { analyzeDocument, getChatResponse } from "./lib/openai";
import { supabase } from "./lib/supabase";
import multer from "multer";

// Define custom Request type with user property
interface AuthRequest extends Request {
  user?: {
    id: number;
    email: string;
  };
}

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

export function registerRoutes(app: Express) {
  // Auth routes
  app.post("/api/auth/signup", async (req, res) => {
    const { email, password } = req.body;
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
  });

  app.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body;
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
  });

  // Document routes
  app.post("/api/documents", upload.single("file"), async (req: AuthRequest, res) => {
    const { title } = req.body;
    const file = req.file;
    
    if (!file) return res.status(400).json({ error: "No file provided" });
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });

    try {
      const { data: uploadData, error: uploadError } = await supabase
        .storage
        .from("documents")
        .upload(`${Date.now()}-${file.originalname}`, file.buffer);

      if (uploadError) return res.status(400).json({ error: uploadError.message });

      const [document] = await db.insert(documents).values({
        title,
        file_url: uploadData.path,
        file_type: file.mimetype,
        content: await analyzeDocument(file.buffer.toString()),
        user_id: req.user.id,
      }).returning();

      res.json(document);
    } catch (error) {
      res.status(500).json({ error: "Failed to process document" });
    }
  });

  app.get("/api/documents", async (req: AuthRequest, res) => {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });

    const userDocuments = await db.query.documents.findMany({
      where: eq(documents.user_id, req.user.id),
      orderBy: documents.created_at,
    });
    res.json(userDocuments);
  });

  // Chat routes
  app.post("/api/chats", async (req: AuthRequest, res) => {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });

    const { document_id, title } = req.body;
    const [chat] = await db.insert(chats).values({
      document_id,
      title,
      user_id: req.user.id,
    }).returning();
    res.json(chat);
  });

  app.post("/api/chats/:chatId/messages", async (req, res) => {
    const { content } = req.body;
    const chatId = parseInt(req.params.chatId);

    try {
      // Save user message
      const [userMessage] = await db.insert(messages).values({
        chat_id: chatId,
        content,
        role: "user",
      }).returning();

      // Get chat with document
      const chat = await db.query.chats.findFirst({
        where: eq(chats.id, chatId),
        with: {
          document: true,
        },
      });

      if (!chat || !chat.document) {
        throw new Error("Chat or document not found");
      }

      // Get AI response
      const aiResponse = await getChatResponse(content, chat.document.content);

      // Save AI message
      const [aiMessage] = await db.insert(messages).values({
        chat_id: chatId,
        content: aiResponse,
        role: "assistant",
      }).returning();

      res.json([userMessage, aiMessage]);
    } catch (error) {
      res.status(500).json({ error: "Failed to process message" });
    }
  });

  app.get("/api/chats/:chatId/messages", async (req, res) => {
    const chatId = parseInt(req.params.chatId);
    const chatMessages = await db.query.messages.findMany({
      where: eq(messages.chat_id, chatId),
      orderBy: messages.created_at,
    });
    res.json(chatMessages);
  });
}
