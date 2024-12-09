import type { Express } from "express";
import { createUser, loginUser } from "./lib/auth";
import { authenticateToken } from "./middleware/auth";
import documentsRouter from "./routes/documents";
import chatRouter from "./routes/chat";

export default function setupRoutes(app: Express) {
  // Public routes
  app.post("/api/auth/signup", async (req, res) => {
    try {
      const { email, password, name } = req.body;
      const user = await createUser(email, password, name);
      const result = await loginUser(email, password); // Auto login after signup
      res.json(result);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Failed to create user" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      const result = await loginUser(email, password);
      res.json(result);
    } catch (error) {
      res.status(401).json({ error: error instanceof Error ? error.message : "Login failed" });
    }
  });

  // Protected routes
  app.use("/api/documents", authenticateToken, documentsRouter);
  app.use("/api/chat", authenticateToken, chatRouter);
}
