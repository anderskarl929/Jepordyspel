import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import path from "path";

import categoriesRouter from "./routes/categories";
import questionsRouter from "./routes/questions";
import gamesRouter from "./routes/games";
import boardsRouter from "./routes/boards";
import { setupGameEngine } from "./game/engine";
import { seedDatabase } from "./db/seed";

const PORT = process.env.PORT || 3001;
const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_ORIGIN || [
      "http://localhost:5173",
      "http://localhost:3001",
    ],
    methods: ["GET", "POST"],
  },
});

// Middleware
app.use(cors());
app.use(express.json({ limit: "1mb" }));

// API routes
app.use("/api/categories", categoriesRouter);
app.use("/api/questions", questionsRouter);
app.use("/api/games", gamesRouter);
app.use("/api/boards", boardsRouter);

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Serve static frontend files (from client/dist in production)
const clientDistPath = path.join(__dirname, "../../client/dist");
app.use(express.static(clientDistPath));

// SPA fallback: serve index.html for any non-API routes
app.get("*", (req, res) => {
  if (req.path.startsWith("/api/") || req.path.startsWith("/socket.io/")) {
    return res.status(404).json({ error: "Not found" });
  }
  res.sendFile(path.join(clientDistPath, "index.html"), (err) => {
    if (err) {
      res.status(200).send("Frontend not built yet. Run the client build first.");
    }
  });
});

// Initialize game engine
setupGameEngine(io);

// Seed database on startup
seedDatabase();

httpServer.listen(PORT, () => {
  console.log(`Jeopardy server running on http://localhost:${PORT}`);
  console.log(`Socket.IO listening for connections`);
  console.log(`Serving static files from ${clientDistPath}`);
});
