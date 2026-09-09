import Message from "@features/chat/message/message.models.js";
import Channel from "@features/chat/channel/channel.models.js";
import logger from "@utils/logger.js";

export const createMessageService = async (
  channelId,
  senderId,
  content,
  type,
) => {
  try {
    const newMessage = await Message.create({
      channelId,
      senderId,
      content,
      type,
    });

    await Channel.findByIdAndUpdate(channelId, {
      lastMessage: {
        messageId: newMessage._id,
        content: newMessage.content,
        senderId: newMessage.senderId,
        sentAt: newMessage.createdAt,
      },
    });

    logger.info(`Message created in channel ${channelId} by user ${senderId}`);

    return newMessage;
  } catch (error) {
    logger.error(
      `Error creating message in channel ${channelId} by user ${senderId}: ${error.message}`,
    );
    throw error;
  }
};

export const getMessagesByChannelIdService = async (
  channelId,
  limit = 50,
  cursor,
) => {
  try {
    const query = { channelId, isDeleted: false };

    if (cursor) {
      query.$or = [
        { createdAt: { $lt: new Date(cursor.createdAt) } },
        {
          createdAt: new Date(cursor.createdAt),
          _id: { $lt: cursor._id },
        },
      ];
    }

    const messages = await Message.find(query)
      .sort({ createdAt: -1, _id: -1 })
      .limit(limit);

    let nextCursor = null;
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      nextCursor = {
        createdAt: lastMessage.createdAt,
        _id: lastMessage._id,
      };
    }

    return { messages, nextCursor };
  } catch (error) {
    logger.error(
      `Error fetching messages for channel ${channelId}: ${error.message}`,
    );
    throw error;
  }
};

export const deleteMessageService = async (messageid, userId) => {
  try {
    const message = await Message.findById(messageid);
    if (!message) {
      throw new Error("Message not found");
    }

    // Permission check moved to middleware (checkPermission with ownership validation)

    const deletedMessage = await Message.findByIdAndUpdate(
      messageid,
      { isDeleted: true, deletedBy: userId, deletedAt: new Date() },
      { new: true },
    );

    logger.info(`Message ${messageid} deleted by user ${userId}`);

    return deletedMessage;
  } catch (error) {
    logger.error(`Error deleting message ${messageid}: ${error.message}`);
    throw error;
  }
};

export const editMessageService = async (messageid, userId, content) => {
  try {
    const message = await Message.findById(messageid);
    if (!message) {
      throw new Error("Message not found");
    }

    // Permission check moved to middleware (checkPermission with ownership validation)

    const updatedMessage = await Message.findByIdAndUpdate(
      messageid,
      { content: content, isEdited: true },
      { new: true },
    );

    logger.info(`Message ${messageid} edited by user ${userId}`);

    return updatedMessage;
  } catch (error) {
    logger.error(`Error editing message ${messageid}: ${error.message}`);
    throw error;
  }
};

export const getMessageByIdService = async (messageId) => {
  try {
    const message = await Message.findById(messageId);
    if (!message) {
      throw new Error("Message not found");
    }
    return message;
  } catch (error) {
    logger.error(`Error fetching message ${messageId}: ${error.message}`);
    throw error;
  }
};

export const bulkDeleteMessagesService = async (messageIds, userId) => {
  try {
    const messages = await Message.find({ _id: { $in: messageIds } });

    // Permission check moved to middleware (checkPermission with ownership validation)
    // Middleware will verify canDeleteMessages (own) or canDeleteAllMessages (all)

    const deletedMessages = await Message.updateMany(
      { _id: { $in: messageIds } },
      { isDeleted: true, deletedBy: userId, deletedAt: new Date() },
    );
    logger.info(`Bulk deleted messages by user ${userId}`);

    return deletedMessages;
  } catch (error) {
    logger.error(`Error bulk deleting messages: ${error.message}`);
    throw error;
  }
};

export const countMessagesByChannelIdService = async (channelId) => {
  try {
    const count = await Message.countDocuments({ channelId, isDeleted: false });
    return count;
  } catch (error) {
    logger.error(
      `Error counting messages for channel ${channelId}: ${error.message}`,
    );
    throw error;
  }
};

export const searchMessagesInChannelService = async (
  channelId,
  searchTerm,
  limit = 50,
  cursor,
) => {
  try {
    const query = {
      channelId,
      isDeleted: false,
      $text: { $search: searchTerm },
    };

    if (cursor) {
      query.$or = [
        { createdAt: { $lt: new Date(cursor.createdAt) } },
        {
          createdAt: new Date(cursor.createdAt),
          _id: { $lt: cursor._id },
        },
      ];
    }

    const messages = await Message.find(query, {
      score: { $meta: "textScore" },
    })
      .sort({ score: { $meta: "textScore" }, createdAt: -1, _id: -1 })
      .limit(limit);

    let nextCursor = null;
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      nextCursor = {
        createdAt: lastMessage.createdAt,
        _id: lastMessage._id,
      };
    }

    return { messages, nextCursor };
  } catch (error) {
    logger.error(
      `Error searching messages in channel ${channelId}: ${error.message}`,
    );
    throw error;
  }
};

export const pinMessageService = async (messageId, userId) => {
  try {
    const message = await Message.findById(messageId);
    if (!message) {
      throw new Error("Message not found");
    }

    const channel = await Channel.findById(message.channelId);
    if (!channel) {
      throw new Error("Channel not found");
    }

    // Permission check moved to middleware (checkPermission for pinning messages)

    if (channel.pinnedMessages.includes(messageId)) {
      throw new Error("Message is already pinned");
    }

    const pinnedMessage = await Channel.findByIdAndUpdate(
      channel._id,
      { $push: { pinnedMessages: messageId } },
      { new: true },
    );

    logger.info(`Message ${messageId} pinned by user ${userId}`);

    return pinnedMessage;
  } catch (error) {
    logger.error(`Error pinning message ${messageId}: ${error.message}`);
    throw new Error(`Error pinning message: ${error.message}`);
  }
};

export const unpinMessageService = async (messageId, userId) => {
  try {
    const message = await Message.findById(messageId);
    if (!message) {
      throw new Error("Message not found");
    }

    const channel = await Channel.findById(message.channelId);
    if (!channel) {
      throw new Error("Channel not found");
    }

    // Permission check moved to middleware (checkPermission for pinning messages)

    if (!channel.pinnedMessages.includes(messageId)) {
      throw new Error("Message is not pinned");
    }

    const unpinnedMessage = await Channel.findByIdAndUpdate(
      channel._id,
      { $pull: { pinnedMessages: messageId } },
      { new: true },
    );

    logger.info(`Message ${messageId} unpinned by user ${userId}`);

    return unpinnedMessage;
  } catch (error) {
    logger.error(`Error unpinning message ${messageId}: ${error.message}`);
    throw new Error(`Error unpinning message: ${error.message}`);
  }
};

export const getPinnedMessagesByChannelIdService = async (channelId) => {
  try {
    const channel = await Channel.findById(channelId);
    const pinnedMessages = await Message.find({
      _id: { $in: channel.pinnedMessages },
    });

    if (!pinnedMessages) {
      logger.info(`No pinned messages found for channel ${channelId}`);
      throw new Error("No pinned messages found");
    }

    logger.info(`Fetched pinned messages for channel ${channelId}`);
    return pinnedMessages;
  } catch (error) {
    logger.error(
      `Error fetching pinned messages for channel ${channelId}: ${error.message}`,
    );
    throw new Error(`Error fetching pinned messages: ${error.message}`);
  }
};
