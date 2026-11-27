import { verifyAccessToken } from "../utils/jwt.js";

export const authenticateWebSocket = (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) {
      return next(new Error("Authentication error: Token not provided"));
    }

    const user = verifyAccessToken(token);
    if (!user) {
      return next(new Error("Authentication error: Invalid token"));
    }

    socket.user = user;
    next();
  } catch (error) {
    console.error("WebSocket authentication error:", error);
    next(new Error("Authentication error"));
  }
};
