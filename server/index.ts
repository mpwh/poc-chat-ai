import express from "express";
import setupRoutes from "./routes.js";
import { setupVite, serveStatic } from "./vite.js";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

// Ensure environment variables are loaded
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function log(message: string) {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour12: false,
  });
  console.log(`[${formattedTime}] ${message}`);
}

const app = express();

// Add JSON and URL-encoded body parsing middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Add CORS headers with proper file upload support
app.use((_req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With');
  res.header('Access-Control-Expose-Headers', 'Content-Range, X-Content-Range');
  
  // Handle preflight requests
  if (_req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

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
    const port = process.env.PORT ? parseInt(process.env.PORT) : 3000;
    
    // Ensure the port is valid
    if (isNaN(port)) {
      throw new Error(`Invalid port: ${process.env.PORT}`);
    }

    await new Promise<void>((resolve, reject) => {
      server.listen(port, "0.0.0.0", () => {
        log(`Server running on port ${port}`);
        resolve();
      }).on('error', (err: NodeJS.ErrnoException) => {
        if (err.code === 'EADDRINUSE') {
          log(`Port ${port} is in use, trying alternative port`);
          server.listen(0, "0.0.0.0", () => {
            const address = server.address();
            if (address && typeof address === 'object') {
              log(`Server running on port ${address.port}`);
              resolve();
            } else {
              reject(new Error('Could not get server address'));
            }
          });
        } else {
          console.error("Server listen error:", err);
          reject(err);
        }
      });
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

// Handle graceful shutdown
process.on('SIGTERM', () => {
  log('Received SIGTERM signal. Shutting down gracefully...');
  server.close(() => {
    log('Server closed');
    process.exit(0);
  });
});

startServer().catch((error) => {
  console.error("Server startup failed:", error);
  process.exit(1);
});

export default app;
