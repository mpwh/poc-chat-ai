import type { Express, Request, Response, NextFunction } from "express";
import { db } from "../db";
import { documents, chats, messages, users } from "@db/schema";
import { eq } from "drizzle-orm";
import { analyzeDocument, getChatResponse } from "./lib/openai";
import { createUser, loginUser, verifyToken } from "./lib/auth";
import multer from "multer";

// Define custom Request type with user property
interface AuthRequest extends Request {
  user?: {
    id: number;
    email: string;
  };
}

// Auth middleware with proper typing
const authMiddleware = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: "No authorization header" });
  }

  try {
    const token = authHeader.split(" ")[1];
    const { userId } = verifyToken(token);

    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user) {
      throw new Error("User not found");
    }

    req.user = {
      id: user.id,
      email: user.email,
    };
    next();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unauthorized";
    return res.status(401).json({ error: errorMessage });
  }
};

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

export function registerRoutes(app: Express) {
  // Auth routes with local PostgreSQL authentication
  app.post("/api/auth/signup", async (req: Request, res: Response) => {
    try {
      // Validate request body
      const { email, password, name } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
      }
      
      if (password.length < 6) {
        return res.status(400).json({ error: "Password must be at least 6 characters long" });
      }

      if (!email.includes('@')) {
        return res.status(400).json({ error: "Invalid email format" });
      }

      const user = await createUser(email, password, name || email.split('@')[0]);
      const response = await loginUser(email, password); // Automatically log in after signup
      res.json(response);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Signup failed";
      
      if (errorMessage.includes('unique constraint')) {
        return res.status(409).json({ error: "Email already registered" });
      }
      
      res.status(400).json({ error: errorMessage });
    }
  });

  app.post("/api/auth/login", async (req: Request, res: Response) => {
    const { email, password } = req.body;
    try {
      const response = await loginUser(email, password);
      res.json(response);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Login failed";
      res.status(400).json({ error: errorMessage });
    }
  });
  // Get current user
  app.get("/api/auth/me", authMiddleware, async (req: AuthRequest, res: Response) => {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });

    try {
      const user = await db.query.users.findFirst({
        where: eq(users.id, req.user.id),
      });

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      res.json({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to get user data";
      res.status(500).json({ error: errorMessage });
    }
  });


  // Document routes with auth middleware
  app.post(
    "/api/documents",
    authMiddleware,
    upload.single("file"),
    async (req: AuthRequest, res: Response) => {
      const { title } = req.body;
      const file = req.file;

      if (!file) return res.status(400).json({ error: "No file provided" });
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });

      try {
        const content = file.buffer.toString();
        const analysis = await analyzeDocument(content);

        const [document] = await db
          .insert(documents)
          .values({
            title,
            content: analysis,
            file_url: "", // Store content directly
            file_type: file.mimetype,
            user_id: req.user.id,
          })
          .returning();

        res.json(document);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Failed to process document";
        res.status(500).json({ error: errorMessage });
      }
    }
  );

  app.get(
    "/api/documents",
    authMiddleware,
    async (req: AuthRequest, res: Response) => {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });

      try {
        const userDocuments = await db.query.documents.findMany({
          where: eq(documents.user_id, req.user.id),
          orderBy: documents.created_at,
        });
        res.json(userDocuments);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Failed to fetch documents";
        res.status(500).json({ error: errorMessage });
      }
    }
  );

  // Chat routes
  app.post(
    "/api/chats",
    authMiddleware,
    async (req: AuthRequest, res: Response) => {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });

      try {
        const { document_id, title } = req.body;
        const [chat] = await db
          .insert(chats)
          .values({
            document_id,
            title,
            user_id: req.user.id,
          })
          .returning();
        res.json(chat);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Failed to create chat";
        res.status(500).json({ error: errorMessage });
      }
    }
  );

  app.post(
    "/api/chats/:chatId/messages",
    authMiddleware,
    async (req: AuthRequest, res: Response) => {
      const { content } = req.body;
      const chatId = parseInt(req.params.chatId);

      try {
        // Save user message
        const [userMessage] = await db
          .insert(messages)
          .values({
            chat_id: chatId,
            content,
            role: "user",
          })
          .returning();

        // Get chat with document
        type ChatWithDocument = {
          document: {
            content: string;
            title: string;
          } | null;
        };

        const chat = await db.query.chats.findFirst({
          where: eq(chats.id, chatId),
          with: {
            document: {
              columns: {
                content: true,
                title: true
              }
            },
          },
        }) as ChatWithDocument | null;

        if (!chat?.document?.content) {
          throw new Error("Chat or document content not found");
        }

        // Get AI response
        const aiResponse = await getChatResponse(content, chat.document.content);

        // Save AI message
        const [aiMessage] = await db
          .insert(messages)
          .values({
            chat_id: chatId,
            content: aiResponse,
            role: "assistant",
          })
          .returning();

        res.json([userMessage, aiMessage]);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Failed to process message";
        res.status(500).json({ error: errorMessage });
      }
    }
  );

  app.get(
    "/api/chats/:chatId/messages",
    authMiddleware,
    async (req: AuthRequest, res: Response) => {
      const chatId = parseInt(req.params.chatId);
      try {
        const chatMessages = await db.query.messages.findMany({
          where: eq(messages.chat_id, chatId),
          orderBy: messages.created_at,
        });
        res.json(chatMessages);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Failed to fetch messages";
        res.status(500).json({ error: errorMessage });
      }
    }
  );
}
