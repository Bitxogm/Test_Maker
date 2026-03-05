import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { createServer } from "http";
import { Server } from "socket.io";
import dotenv from "dotenv";
import { createApiRouter } from "./api/routes";
import { setupWebSockets } from "./api/websockets/testStream";

// Cargar variables de entorno
dotenv.config({ path: "../../.env.local" });

const app = express();
const httpServer = createServer(app);

// ── Socket.io ─────────────────────────────────────────────────────
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

// ── Middlewares globales ───────────────────────────────────────────
app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL || "http://localhost:3000" }));
app.use(morgan("dev"));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

// ── Rutas ─────────────────────────────────────────────────────────
app.use("/api", createApiRouter(io));

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ── WebSockets ────────────────────────────────────────────────────
setupWebSockets(io);

// ── Arrancar servidor ─────────────────────────────────────────────
const PORT = process.env.PORT || 3001;

httpServer.listen(PORT, () => {
  console.warn(`🚀 API corriendo en http://localhost:${PORT}`);
  console.warn(`🔌 WebSockets listos`);
  console.warn(`🌍 Entorno: ${process.env.NODE_ENV || "development"}`);
});
