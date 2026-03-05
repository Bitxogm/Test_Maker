import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { createServer } from "http";
import { Server } from "socket.io";
import dotenv from "dotenv";

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
app.use(helmet()); // Cabeceras de seguridad
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
  })
);
app.use(morgan("dev")); // Logs de peticiones
app.use(express.json({ limit: "1mb" })); // Parsear JSON (límite para código grande)
app.use(express.urlencoded({ extended: true }));

// ── Rutas ─────────────────────────────────────────────────────────
// TODO: importar rutas cuando las creemos
// app.use("/api/auth", authRouter);
// app.use("/api/sessions", sessionsRouter);

// Health check — útil para Docker y Hetzner
app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
  });
});

// ── WebSockets ────────────────────────────────────────────────────
io.on("connection", (socket) => {
  console.warn(`Cliente conectado: ${socket.id}`);

  socket.on("disconnect", () => {
    console.warn(`Cliente desconectado: ${socket.id}`);
  });
});

// ── Arrancar servidor ─────────────────────────────────────────────
const PORT = process.env.PORT || 3001;

httpServer.listen(PORT, () => {
  console.warn(`🚀 API corriendo en http://localhost:${PORT}`);
  console.warn(`🔌 WebSockets listos`);
  console.warn(`🌍 Entorno: ${process.env.NODE_ENV || "development"}`);
});

export { io };
