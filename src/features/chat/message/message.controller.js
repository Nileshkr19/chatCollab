// Message Controllers

import asyncHandler from "@utils/asyncHandler.js";
import apiResponse from "@utils/apiResponse.js";
import apiError from "@utils/apiError.js";
import logger from "@utils/logger.js";

import {
  createMessageService,
  getMessagesByChannelIdService,
  deleteMessageService,
  editMessageService,
  getMessageByIdService,
  bulkDeleteMessagesService,
  countMessagesByChannelIdService,
  searchMessagesInChannelService,
  pinMessageService,
  unpinMessageService,
  getPinnedMessagesByChannelIdService,
} from "./message.service.js";

// ============================================================
// CREATE MESSAGE
// ============================================================

export const createMessageController = asyncHandler(async (req, res) => {
  const channelId = req.params.channelId;
  const senderId = req.user.userId;
  const { content, type, parentId } = req.body;

  if (!content || content.trim() === "") {
    throw new apiError(400, "Message content cannot be empty");
  }

  const newMessage = await createMessageService(
    channelId,
    senderId,
    content,
    type,
    parentId,
  );

  logger.info(`Message created in channel ${channelId} by user ${senderId}`);

  res
    .status(201)
    .json(new apiResponse(true, "Message created successfully", newMessage));
});

// ============================================================
// GET MESSAGES BY CHANNEL ID
// ============================================================

export const getMessagesByChannelIdController = asyncHandler(
  async (req, res) => {
    const channelId = req.params.channelId;
    const limit = parseInt(req.query.limit, 10) || 50;
    const cursor = req.query.cursor ? JSON.parse(req.query.cursor) : null;

    const messages = await getMessagesByChannelIdService(
      channelId,
      limit,
      cursor,
    );

    res
      .status(200)
      .json(new apiResponse(true, "Messages retrieved successfully", messages));
  },
);

// ============================================================
// DELETE MESSAGE
// ============================================================

export const deleteMessageController = asyncHandler(async (req, res) => {
  const channelId = req.params.channelId;
  const messageId = req.params.messageId;
  const userId = req.user.userId;

  const deletedMessage = await deleteMessageService(
    channelId,
    messageId,
    userId,
  );

  logger.info(`Message ${messageId} deleted by user ${userId}`);

  res
    .status(200)
    .json(
      new apiResponse(true, "Message deleted successfully", deletedMessage),
    );
});

// ============================================================
// EDIT MESSAGE
// ============================================================

export const editMessageController = asyncHandler(async (req, res) => {
  const channelId = req.params.channelId;
  const messageId = req.params.messageId;
  const userId = req.user.userId;
  const { content } = req.body;

  if (!content || content.trim() === "") {
    throw new apiError(400, "Message content cannot be empty");
  }

  const updatedMessage = await editMessageService(
    channelId,
    messageId,
    userId,
    content,
  );

  logger.info(`Message ${messageId} edited by user ${userId}`);

  res
    .status(200)
    .json(new apiResponse(true, "Message edited successfully", updatedMessage));
});

// ============================================================
// GET MESSAGE BY ID
// ============================================================

export const getMessageByIdController = asyncHandler(async (req, res) => {
  const channelId = req.params.channelId;
  const messageId = req.params.messageId;

  const message = await getMessageByIdService(channelId, messageId);

  logger.info(`Message ${messageId} retrieved`);

  res
    .status(200)
    .json(new apiResponse(true, "Message retrieved successfully", message));
});

// ============================================================
// BULK DELETE MESSAGES
// ============================================================

export const bulkDeleteMessagesController = asyncHandler(async (req, res) => {
  const channelId = req.params.channelId;
  const userId = req.user.userId;
  const { messageIds } = req.body;

  const result = await bulkDeleteMessagesService(
    channelId,
    userId,
    messageIds,
    req.permission,
    req.membership?.role === "OWNER",
  );

  logger.info(
    `Bulk deleted ${result.modifiedCount} messages in channel ${channelId} by user ${userId}`,
  );

  res
    .status(200)
    .json(
      new apiResponse(true, "Messages deleted successfully", {
        deletedCount: result.modifiedCount,
      }),
    );
});

// ============================================================
// COUNT MESSAGES
// ============================================================

export const countMessagesByChannelIdController = asyncHandler(
  async (req, res) => {
    const channelId = req.params.channelId;

    const count = await countMessagesByChannelIdService(channelId);

    logger.info(`Counted messages in channel ${channelId}`);

    res
      .status(200)
      .json(
        new apiResponse(true, "Message count retrieved successfully", {
          count,
        }),
      );
  },
);

// ============================================================
// SEARCH MESSAGES
// ============================================================

export const searchMessagesInChannelController = asyncHandler(
  async (req, res) => {
    const channelId = req.params.channelId;
    const searchTerm = req.query.q;
    const limit = parseInt(req.query.limit, 10) || 50;
    const cursor = req.query.cursor ? JSON.parse(req.query.cursor) : null;

    if (!searchTerm || searchTerm.trim() === "") {
      throw new apiError(400, "Search term cannot be empty");
    }

    const { messages, nextCursor } = await searchMessagesInChannelService(
      channelId,
      searchTerm,
      limit,
      cursor,
    );

    logger.info(
      `Searched messages in channel ${channelId} with term "${searchTerm}"`,
    );

    res.status(200).json(
      new apiResponse(true, "Messages searched successfully", {
        messages,
        nextCursor,
      }),
    );
  },
);

// ============================================================
// PIN MESSAGE
// ============================================================

export const pinMessageController = asyncHandler(async (req, res) => {
  const channelId = req.params.channelId;
  const messageId = req.params.messageId;
  const userId = req.user.userId;

  const pinnedChannel = await pinMessageService(channelId, messageId, userId);

  logger.info(`Message ${messageId} pinned by user ${userId}`);

  res
    .status(200)
    .json(new apiResponse(true, "Message pinned successfully", pinnedChannel));
});

// ============================================================
// UNPIN MESSAGE
// ============================================================

export const unpinMessageController = asyncHandler(async (req, res) => {
  const channelId = req.params.channelId;
  const messageId = req.params.messageId;
  const userId = req.user.userId;

  const unpinnedChannel = await unpinMessageService(
    channelId,
    messageId,
    userId,
  );

  logger.info(`Message ${messageId} unpinned by user ${userId}`);

  res
    .status(200)
    .json(
      new apiResponse(true, "Message unpinned successfully", unpinnedChannel),
    );
});

// ============================================================
// GET PINNED MESSAGES
// ============================================================

export const getPinnedMessagesByChannelIdController = asyncHandler(
  async (req, res) => {
    const channelId = req.params.channelId;

    const pinnedMessages = await getPinnedMessagesByChannelIdService(channelId);

    logger.info(`Retrieved pinned messages for channel ${channelId}`);

    res
      .status(200)
      .json(
        new apiResponse(
          true,
          "Pinned messages retrieved successfully",
          pinnedMessages,
        ),
      );
  },
);
