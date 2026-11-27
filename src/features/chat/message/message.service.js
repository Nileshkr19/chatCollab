import Message from "@features/chat/message/message.models.js";
import Channel from "@features/chat/channel/channel.models.js";
import logger from "@utils/logger.js";
import ChannelMember from "@features/chat/member/channelMember.models.js";
import { incrementUnreadCount } from "@features/chat/readReceipts/readReceipts.service.js";
import apiError from "@utils/apiError";

// ============================================================
// CREATE MESSAGE
// ============================================================

export const createMessageService = async (
  channelId,
  senderId,
  content,
  type,
  parentId,
) => {
  try {
    const newMessage = await Message.create({
      channelId,
      senderId,
      content,
      type,
      parentId,
    });

    await Channel.findByIdAndUpdate(channelId, {
      lastMessage: {
        messageId: newMessage._id,
        content: newMessage.content,
        senderId: newMessage.senderId,
        sentAt: newMessage.createdAt,
      },
    });

    const members = await ChannelMember.find({
      channelId,
      isRemoved: false,
      userId: { $ne: senderId },
    }).select("userId");

    await Promise.all(
      members.map((member) => incrementUnreadCount(channelId, member.userId)),
    );

    logger.info(`Message created in channel ${channelId} by user ${senderId}`);

    return newMessage;
  } catch (error) {
    logger.error(
      `Error creating message in channel ${channelId}: ${error.message}`,
    );
    throw error;
  }
};

// ============================================================
// GET MESSAGES BY CHANNEL ID
// ============================================================

export const getMessagesByChannelIdService = async (
  channelId,
  limit = 50,
  cursor,
) => {
  try {
    const query = {
      channelId,
      isDeleted: false,
    };

    if (cursor) {
      const cursorDate = new Date(cursor.createdAt);

      query.$or = [
        { createdAt: { $lt: cursorDate } },
        {
          createdAt: cursorDate,
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

    return {
      messages,
      nextCursor,
    };
  } catch (error) {
    logger.error(
      `Error fetching messages for channel ${channelId}: ${error.message}`,
    );
    throw error;
  }
};

// ============================================================
// DELETE MESSAGE
// ============================================================

export const deleteMessageService = async (channelId, messageId, userId) => {
  try {
    const deletedMessage = await Message.findOneAndUpdate(
      {
        _id: messageId,
        channelId,
        isDeleted: false,
      },
      {
        $set: {
          isDeleted: true,
          deletedBy: userId,
          deletedAt: new Date(),
        },
      },
      { new: true },
    );

    if (!deletedMessage) {
      throw new apiError(404, "Message not found in this channel");
    }

    logger.info(`Message ${messageId} deleted by user ${userId}`);

    return deletedMessage;
  } catch (error) {
    logger.error(`Error deleting message ${messageId}: ${error.message}`);
    throw error;
  }
};

// ============================================================
// EDIT MESSAGE
// ============================================================

export const editMessageService = async (
  channelId,
  messageId,
  userId,
  content,
) => {
  try {
    const updatedMessage = await Message.findOneAndUpdate(
      {
        _id: messageId,
        channelId,
        isDeleted: false,
      },
      {
        $set: {
          content,
          isEdited: true,
        },
      },
      { new: true, runValidators: true },
    );

    if (!updatedMessage) {
      throw new apiError(404, "Message not found in this channel");
    }

    logger.info(`Message ${messageId} edited by user ${userId}`);

    return updatedMessage;
  } catch (error) {
    logger.error(`Error editing message ${messageId}: ${error.message}`);
    throw error;
  }
};

// ============================================================
// GET MESSAGE BY ID
// ============================================================

export const getMessageByIdService = async (channelId, messageId) => {
  try {
    const message = await Message.findOne({
      _id: messageId,
      channelId,
      isDeleted: false,
    });

    if (!message) {
      throw new apiError(404, "Message not found in this channel");
    }

    return message;
  } catch (error) {
    logger.error(`Error fetching message ${messageId}: ${error.message}`);
    throw error;
  }
};

// ============================================================
// BULK DELETE MESSAGES
// ============================================================

export const bulkDeleteMessagesService = async (
  channelId,
  userId,
  messageIds,
  permissions,
  isWorkspaceOwner,
) => {
  try {
    const uniqueMessageIds = [...new Set(messageIds)];

    if (uniqueMessageIds.length === 0) {
      throw new apiError(400, "No message IDs provided");
    }

    const messages = await Message.find({
      _id: { $in: uniqueMessageIds },
      channelId,
      isDeleted: false,
    })
      .select("_id senderId")
      .lean();

    if (messages.length !== uniqueMessageIds.length) {
      throw new apiError(
        404,
        "One or more messages were not found in this channel",
      );
    }

    if (!isWorkspaceOwner) {
      const canDeleteOwn = permissions?.messages?.deleteOwn;
      const canDeleteAll = permissions?.messages?.deleteAll;

      const hasOtherUsersMessages = messages.some(
        (message) => String(message.senderId) !== String(userId),
      );

      if (!canDeleteOwn && !canDeleteAll) {
        throw new apiError(
          403,
          "You do not have permission to delete messages",
        );
      }

      if (hasOtherUsersMessages && !canDeleteAll) {
        throw new apiError(
          403,
          "You cannot delete messages sent by other users",
        );
      }
    }

    const deletedMessages = await Message.updateMany(
      {
        _id: { $in: uniqueMessageIds },
        channelId,
        isDeleted: false,
      },
      {
        $set: {
          isDeleted: true,
          deletedBy: userId,
          deletedAt: new Date(),
        },
      },
    );

    logger.info(
      `Bulk deleted ${deletedMessages.modifiedCount} messages by user ${userId}`,
    );

    return deletedMessages;
  } catch (error) {
    logger.error(`Error bulk deleting messages: ${error.message}`);
    throw error;
  }
};

// ============================================================
// COUNT MESSAGES
// ============================================================

export const countMessagesByChannelIdService = async (channelId) => {
  try {
    return await Message.countDocuments({
      channelId,
      isDeleted: false,
    });
  } catch (error) {
    logger.error(
      `Error counting messages for channel ${channelId}: ${error.message}`,
    );
    throw error;
  }
};

// ============================================================
// SEARCH MESSAGES
// ============================================================

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
      const cursorDate = new Date(cursor.createdAt);

      query.$or = [
        { createdAt: { $lt: cursorDate } },
        {
          createdAt: cursorDate,
          _id: { $lt: cursor._id },
        },
      ];
    }

    // Chronological sorting keeps cursor pagination consistent.
    const messages = await Message.find(query, {
      score: { $meta: "textScore" },
    })
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

    return {
      messages,
      nextCursor,
    };
  } catch (error) {
    logger.error(
      `Error searching messages in channel ${channelId}: ${error.message}`,
    );
    throw error;
  }
};

// ============================================================
// PIN MESSAGE
// ============================================================

export const pinMessageService = async (channelId, messageId, userId) => {
  try {
    const message = await Message.findOne({
      _id: messageId,
      channelId,
      isDeleted: false,
    }).select("_id");

    if (!message) {
      throw new apiError(404, "Message not found in this channel");
    }

    // Atomic operation: prevents duplicate pinned IDs.
    const pinnedChannel = await Channel.findOneAndUpdate(
      {
        _id: channelId,
        pinnedMessages: { $ne: message._id },
      },
      {
        $addToSet: {
          pinnedMessages: message._id,
        },
      },
      { new: true },
    );

    if (!pinnedChannel) {
      const channelExists = await Channel.exists({
        _id: channelId,
      });

      if (!channelExists) {
        throw new apiError(404, "Channel not found");
      }

      throw new apiError(409, "Message is already pinned");
    }

    logger.info(`Message ${messageId} pinned by user ${userId}`);

    return pinnedChannel;
  } catch (error) {
    logger.error(`Error pinning message ${messageId}: ${error.message}`);
    throw error;
  }
};

// ============================================================
// UNPIN MESSAGE
// ============================================================

export const unpinMessageService = async (channelId, messageId, userId) => {
  try {
    const message = await Message.findOne({
      _id: messageId,
      channelId,
      isDeleted: false,
    }).select("_id");

    if (!message) {
      throw new apiError(404, "Message not found in this channel");
    }

    // Atomic operation: removes the message ID from pinnedMessages.
    const unpinnedChannel = await Channel.findOneAndUpdate(
      {
        _id: channelId,
        pinnedMessages: message._id,
      },
      {
        $pull: {
          pinnedMessages: message._id,
        },
      },
      { new: true },
    );

    if (!unpinnedChannel) {
      const channelExists = await Channel.exists({
        _id: channelId,
      });

      if (!channelExists) {
        throw new apiError(404, "Channel not found");
      }

      throw new apiError(409, "Message is not pinned");
    }

    logger.info(`Message ${messageId} unpinned by user ${userId}`);

    return unpinnedChannel;
  } catch (error) {
    logger.error(`Error unpinning message ${messageId}: ${error.message}`);
    throw error;
  }
};

// ============================================================
// GET PINNED MESSAGES
// ============================================================

export const getPinnedMessagesByChannelIdService = async (channelId) => {
  try {
    const channel = await Channel.findById(channelId)
      .select("pinnedMessages")
      .lean();

    if (!channel) {
      throw new apiError(404, "Channel not found");
    }

    if (!channel.pinnedMessages?.length) {
      return [];
    }

    const messages = await Message.find({
      _id: { $in: channel.pinnedMessages },
      channelId,
      isDeleted: false,
    }).lean();

    // Preserve the order in which messages were pinned.
    const messagesById = new Map(
      messages.map((message) => [String(message._id), message]),
    );

    const pinnedMessages = channel.pinnedMessages
      .map((id) => messagesById.get(String(id)))
      .filter(Boolean);

    logger.info(
      `Fetched ${pinnedMessages.length} pinned messages for channel ${channelId}`,
    );

    return pinnedMessages;
  } catch (error) {
    logger.error(
      `Error fetching pinned messages for channel ${channelId}: ${error.message}`,
    );
    throw error;
  }
};
