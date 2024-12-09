import express from "express";
import setupRoutes from "./routes";
import { setupVite, serveStatic } from "./vite";
import { createServer } from "http";

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
  setupVite(app);
} else {
  // Serve static files in production
  serveStatic(app);
}

const server = createServer(app);

// Function to find an available port
async function findAvailablePort(startPort: number): Promise<number> {
  return new Promise((resolve) => {
    const tryPort = (port: number) => {
      server.listen(port, "0.0.0.0")
        .on("error", (err: NodeJS.ErrnoException) => {
          if (err.code === "EADDRINUSE") {
            log(`Port ${port} in use, trying ${port + 1}`);
            tryPort(port + 1);
          }
        })
        .on("listening", () => {
          resolve(port);
        });
    };
    tryPort(startPort);
  });
}

// Start server
const startServer = async () => {
  try {
    const port = await findAvailablePort(3000);
    log(`Server running at http://localhost:${port}`);
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();

export default app;
