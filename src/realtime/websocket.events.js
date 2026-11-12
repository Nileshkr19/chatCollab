import { getIO } from "./websocket.server.js";
import { workspaceRoom, channelRoom, userRoom } from "./websocket.rooms.js";

export const SOCKET_EVENTS = {
  MESSAGE_CREATED: "message:created",
  MESSAGE_UPDATED: "message:updated",
  MESSAGE_DELETED: "message:deleted",
  TYPING_STARTED: "typing:started",
  TYPING_STOPPED: "typing:stopped",
  REACTION_ADDED: "reaction:added",
  REACTION_REMOVED: "reaction:removed",
  PRESENCE_UPDATED: "presence:updated",
  READ_RECEIPT_UPDATED: "read_receipt:updated",
  NOTIFICATION_CREATED: "notification:created",
  TASK_UPDATED: "task:updated",
};

export const emitToWorkspace = (workspaceId, event, data) => {
  const io = getIO();
  const room = workspaceRoom(workspaceId);
  io.to(room).emit(event, data);
};

export const emitToChannel = (channelId, event, data) => {
  const io = getIO();
  const room = channelRoom(channelId);
  io.to(room).emit(event, data);
};

export const emitToUser = (userId, event, data) => {
  const io = getIO();
  const room = userRoom(userId);
  io.to(room).emit(event, data);
};
