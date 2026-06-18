import { Server as HttpServer } from "http";
import { Server, Socket } from "socket.io";
import jwt from "jsonwebtoken";

const SECRET = process.env.JWT_SECRET || "gymfit-jwt-secret-dev";

interface AuthenticatedSocket extends Socket {
  userId?: number;
  roleName?: string;
}

export const initSocket = (server: HttpServer) => {
  const io = new Server(server, {
    cors: { origin: ["http://localhost:5173", "http://localhost:3000"], methods: ["GET", "POST"] }
  });

  io.use((socket: AuthenticatedSocket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.query?.token;
      if (!token) return next(new Error("No token"));
      const decoded = jwt.verify(String(token), SECRET) as { userId: number; roleName: string };
      socket.userId = decoded.userId;
      socket.roleName = decoded.roleName;
      next();
    } catch { next(new Error("Invalid token")); }
  });

  const onlineUsers = new Map<number, string[]>(); // userId -> socketIds

  io.on("connection", (socket: AuthenticatedSocket) => {
    const userId = socket.userId!;
    if (!onlineUsers.has(userId)) onlineUsers.set(userId, []);
    onlineUsers.get(userId)!.push(socket.id);

    // Broadcast online status
    io.emit("user:online", { userId, online: true });

    // Join conversation room
    socket.on("conversation:join", (conversationId: number) => {
      socket.join(`conv:${conversationId}`);
    });

    // Leave conversation room
    socket.on("conversation:leave", (conversationId: number) => {
      socket.leave(`conv:${conversationId}`);
    });

    // Typing indicator
    socket.on("typing:start", (data: { conversationId: number }) => {
      socket.to(`conv:${data.conversationId}`).emit("typing:start", { userId, conversationId: data.conversationId });
    });

    socket.on("typing:stop", (data: { conversationId: number }) => {
      socket.to(`conv:${data.conversationId}`).emit("typing:stop", { userId, conversationId: data.conversationId });
    });

    // Read receipt
    socket.on("messages:read", (data: { conversationId: number }) => {
      socket.to(`conv:${data.conversationId}`).emit("messages:read", { userId, conversationId: data.conversationId });
    });

    // Disconnect
    socket.on("disconnect", () => {
      const sockets = onlineUsers.get(userId);
      if (sockets) {
        const idx = sockets.indexOf(socket.id);
        if (idx > -1) sockets.splice(idx, 1);
        if (sockets.length === 0) {
          onlineUsers.delete(userId);
          io.emit("user:online", { userId, online: false });
        }
      }
    });
  });

  return { io, onlineUsers };
};

export type SocketIO = ReturnType<typeof initSocket>;