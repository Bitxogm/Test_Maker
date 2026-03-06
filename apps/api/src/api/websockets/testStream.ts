import { Server, Socket } from "socket.io";

export function setupWebSockets(io: Server) {
  io.on("connection", (socket: Socket) => {
    console.warn(`[Socket] Cliente conectado: ${socket.id}`);

    // Unirse a una sesión de test para recibir logs
    socket.on("test:join", ({ sessionId }: { sessionId: string }) => {
      if (sessionId) {
        socket.join(sessionId);
        console.warn(`[Socket] Cliente ${socket.id} unido a sesión: ${sessionId}`);
        socket.emit("test:joined", { sessionId }); // ← confirmar al cliente
      }
    });

    socket.on("disconnect", () => {
      console.warn(`[Socket] Cliente desconectado: ${socket.id}`);
    });
  });
}
