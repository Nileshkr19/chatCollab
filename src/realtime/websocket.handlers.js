import { canAccessChannel } from "./websocket.helper.js";
import {
  channelRoom,
  joinRoom,
  leaveRoom,
} from "./websocket.rooms.js";

export const registerWebSocketHandlers = (socket) => {
  socket.on("channel:join", async ({ channelId }, callback) => {
    try {
      const hasAccess = await canAccessChannel(
        socket.user.userId,
        channelId,
      );

      if (!hasAccess) {
        return callback?.({
          success: false,
          message: "Access denied to the channel",
        });
      }

      joinRoom(socket, channelRoom(channelId));

      callback?.({
        success: true,
        message: "Joined channel successfully",
      });
    } catch (error) {
      callback?.({
        success: false,
        message: "Unable to join channel",
      });
    }
  });

  socket.on("channel:leave", ({ channelId }, callback) => {
    leaveRoom(socket, channelRoom(channelId));

    callback?.({
      success: true,
      message: "Left channel successfully",
    });
  });

  socket.on("typing:started", async ({ channelId }) => {
    const hasAccess = await canAccessChannel(
      socket.user.userId,
      channelId,
    );

    if (!hasAccess) {
      return;
    }

    socket.to(channelRoom(channelId)).emit("typing:started", {
      channelId,
      userId: socket.user.userId,
    });
  });

  socket.on("typing:stopped", async ({ channelId }) => {
    const hasAccess = await canAccessChannel(
      socket.user.userId,
      channelId,
    );

    if (!hasAccess) {
      return;
    }

    socket.to(channelRoom(channelId)).emit("typing:stopped", {
      channelId,
      userId: socket.user.userId,
    });
  });
};