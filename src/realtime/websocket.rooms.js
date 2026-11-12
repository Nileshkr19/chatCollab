import logger from "../utils/logger.js";

export const workspaceRoom = (workspaceId) => {
  return `workspace:${workspaceId}`;
};

export const channelRoom = (channelId) => {
  return `channel:${channelId}`;
};

export const userRoom = (userId) => {
  return `user:${userId}`;
};

export const joinRoom = (socket, room) => {
  socket.join(room);
  logger.info(`Socket ${socket.id} joined room: ${room}`);
};

export const leaveRoom = (socket, room) => {
  socket.leave(room);
  logger.info(`Socket ${socket.id} left room: ${room}`);
};
