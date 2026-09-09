import ReadReceipt from "./readReceipts.models.js";
import Message from "../message/message.models.js";
import logger from "@utils/logger.js";

export const createReadReceipt = async (channelId, userId) => {
  const newReadReceipt = await ReadReceipt.create({
    channelId,
    userId,
  });

  logger.info(
    `Created new read receipt for user ${userId} in channel ${channelId}`,
  );
  return newReadReceipt;
};

export const updateReadReceipt = async (channelId, userId, messagesId) => {
  const readReceipt = await ReadReceipt.findOne({ channelId, userId });
  if (!readReceipt) {
    logger.warn(
      `No read receipt found for user ${userId} in channel ${channelId}`,
    );
    return null;
  }

  const lastReadMessage = await Message.findById(messagesId);
  if (!lastReadMessage) {
    logger.warn(
      `No message found with ID ${messagesId} for updating read receipt`,
    );
    return null;
  }

  const updatedReadReceipt = await ReadReceipt.findOneAndUpdate(
    { channelId, userId },
    {
      lastReadMessageId: messagesId,
      lastReadAt: new Date(),
      unreadCount: 0,
    },
    { new: true },
  );

  logger.info(
    `Updated read receipt for user ${userId} in channel ${channelId} to message ${messagesId}`,
  );
  return updatedReadReceipt;
};

export const markMessagesAsRead = async (channelId, userId) => {
  const readReceipt = await ReadReceipt.findOne({ channelId, userId });
  if (!readReceipt) {
    logger.warn(
      `No read receipt found for user ${userId} in channel ${channelId}`,
    );
    return null;
  }

  const updatedReadReceipt = await ReadReceipt.findOneAndUpdate(
    { channelId, userId },
    {
      lastReadMessageId: null,
      lastReadAt: new Date(),
      unreadCount: 0,
    },
    { new: true },
  );

  logger.info(
    `Marked all messages as read for user ${userId} in channel ${channelId}`,
  );
  return updatedReadReceipt;
};

export const getReadReceipt = async (channelId, userId) => {
  const readReceipt = await ReadReceipt.findOne({ channelId, userId });
  if (!readReceipt) {
    logger.warn(
      `No read receipt found for user ${userId} in channel ${channelId}`,
    );
    return null;
  }

  logger.info(
    `Retrieved read receipt for user ${userId} in channel ${channelId}`,
  );
  return readReceipt;
};

export const getUnreadCount = async (channelId, userId) => {
  const readReceipt = await ReadReceipt.findOne({ channelId, userId });
  if (!readReceipt) {
    logger.warn(
      `No read receipt found for user ${userId} in channel ${channelId}`,
    );
    return null;
  }

  const unreadCount = readReceipt.unreadCount || 0;
  logger.info(
    `Retrieved unread count for user ${userId} in channel ${channelId}: ${unreadCount}`,
  );
  return unreadCount;
};

export const incrementUnreadCount = async (channelId, userId) => {
  const readReceipt = await ReadReceipt.findOneAndUpdate(
    { channelId, userId },
    { $inc: { unreadCount: 1 } },
    { new: true },
  );

  if (!readReceipt) {
    logger.warn(
      `No read receipt found for user ${userId} in channel ${channelId} to increment unread count`,
    );
    return null;
  }

  logger.info(
    `Incremented unread count for user ${userId} in channel ${channelId}. New unread count: ${readReceipt.unreadCount}`,
  );
  return readReceipt;
};

export const getReadReceiptsByChannel = async (channelId) => {
  const readReceipts = await ReadReceipt.find({ channelId });
  logger.info(
    `Retrieved ${readReceipts.length} read receipts for channel ${channelId}`,
  );
  return readReceipts;
};

export const getReadReceiptsByUser = async (userId) => {
  const readReceipts = await ReadReceipt.find({ userId });
  logger.info(
    `Retrieved ${readReceipts.length} read receipts for user ${userId}`,
  );
  return readReceipts;
};

export const deleteReadReceipt = async (channelId, userId) => {
  const deletedReadReceipt = await ReadReceipt.findOneAndDelete({
    channelId,
    userId,
  });
  if (!deletedReadReceipt) {
    logger.warn(
      `No read receipt found for user ${userId} in channel ${channelId} to delete`,
    );
    return null;
  }

  logger.info(
    `Deleted read receipt for user ${userId} in channel ${channelId}`,
  );
  return deletedReadReceipt;
};

export const updateLastReadMessage = async (channelId, userId, messageId) => {
  const readReceipt = await ReadReceipt.findOneAndUpdate(
    { channelId, userId },
    { lastReadMessageId: messageId, lastReadAt: new Date() },
    { new: true },
  );

  if (!readReceipt) {
    logger.warn(
      `No read receipt found for user ${userId} in channel ${channelId} to update last read message`,
    );
    return null;
  }

  logger.info(
    `Updated last read message for user ${userId} in channel ${channelId} to message ${messageId}`,
  );
  return readReceipt;
};

export const getChannelReadStatus = async (channelId) => {
  const readReceipts = await ReadReceipt.find({ channelId });
  const readStatus = readReceipts.map((receipt) => ({
    userId: receipt.userId,
    lastReadMessageId: receipt.lastReadMessageId,
    lastReadAt: receipt.lastReadAt,
    unreadCount: receipt.unreadCount,
  }));

  logger.info(
    `Retrieved read status for channel ${channelId} with ${readStatus.length} entries`,
  );
  return readStatus;
};
