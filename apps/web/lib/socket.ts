import { io, Socket } from "socket.io-client";

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3001";

class SocketService {
  private static instance: Socket;

  public static getInstance(): Socket {
    if (!SocketService.instance) {
      SocketService.instance = io(SOCKET_URL, {
        autoConnect: true,
        reconnection: true,
      });
    }
    return SocketService.instance;
  }
}

export const socket = SocketService.getInstance();
