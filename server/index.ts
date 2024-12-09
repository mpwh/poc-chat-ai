import express from "express";
import setupRoutes from "./routes.js";
import { setupVite, serveStatic } from "./vite.js";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import dotenv from "dotenv";

// Ensure environment variables are loaded
dotenv.config();

function log(message: string) {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour12: false,
  });
  console.log(`[${formattedTime}] ${message}`);
}

const app = express();

// Add JSON and URL-encoded body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const { method, path } = req;
  let capturedJsonResponse: any;

  // Capture JSON responses
  const originalJson = res.json;
  res.json = function(body) {
    capturedJsonResponse = body;
    return originalJson.call(this, body);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      log(logLine);
    }
  });

  next();
});

// Register all routes
setupRoutes(app);

// Setup Vite in development
if (process.env.NODE_ENV !== "production") {
  setupVite(app); //Note:  The async keyword was removed here because the original code did not have it.  The modified code's async keyword is inconsistent with the original code and likely incorrect.
} else {
  // Serve static files in production
  serveStatic(app);
}

const server = createServer(app);

// Start server
const startServer = async () => {
  const port = 5000;

  try {
    server.listen(port, "0.0.0.0", () => {
      log(`Server running at http://localhost:${port}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

// Only start the server if this file is being run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  startServer();
}

export default app;