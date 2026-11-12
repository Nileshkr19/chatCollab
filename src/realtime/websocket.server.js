import { Server } from "socket.io";
import { authenticateWebSocket } from "./websocket.auth.js";
import { registerWebSocketHandlers } from "./websocket.handlers.js";

let io;

export const initWebSocketServer = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || "http://localhost:5173",
      credentials: true,
    },
  });

  io.use(authenticateWebSocket);

  io.on("connection", (socket) => {
    console.log("A user connected:", socket.id);
    registerWebSocketHandlers(socket);

    socket.on("disconnect", (reason) => {
      console.log("A user disconnected:", socket.id);
      console.log("Reason:", reason);
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error(
      "WebSocket server not initialized. Call initWebSocketServer first.",
    );
  }
  return io;
};
