import { Router } from "express";
import { AuthRequest } from "../middleware/auth";
import { streamChatResponse } from "../lib/openai";

const router = Router();

router.post("/", async (req: AuthRequest, res) => {
  try {
    const { message } = req.body;
    
    // Set headers for streaming
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Stream the response
    for await (const chunk of streamChatResponse(message, [])) {
      res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
    }

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (error) {
    console.error("Chat error:", error);
    res.status(500).json({ error: "Failed to process chat message" });
  }
});

export default router; 