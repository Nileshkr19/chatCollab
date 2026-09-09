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

export const createMessageController = asyncHandler(async (req, res) => {
  const channelId = req.params.channelId;
  const senderId = req.user.userId;
  const { content, type } = req.body;

  if (!content || content.trim() === "") {
    throw new apiError(400, "Message content cannot be empty");
  }

  const newMessage = await createMessageService(
    channelId,
    senderId,
    content,
    type,
  );

  logger.info(`Message created in channel ${channelId} by user ${senderId}`);

  res
    .status(201)
    .json(new apiResponse(true, "Message created successfully", newMessage));
});

export const getMessagesByChannelIdController = asyncHandler(
  async (req, res) => {
    const channelId = req.params.channelId;
    const limit = parseInt(req.query.limit) || 50;
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

export const deleteMessageController = asyncHandler(async (req, res) => {
  const messageId = req.params.messageId;
  const userId = req.user.userId;

  await deleteMessageService(messageId, userId);

  logger.info(`Message ${messageId} deleted by user ${userId}`);

  res.status(200).json(new apiResponse(true, "Message deleted successfully"));
});

export const editMessageController = asyncHandler(async (req, res) => {
  const messageId = req.params.messageId;
  const userId = req.user.userId;
  const { content } = req.body;

  if (!content || content.trim() === "") {
    throw new apiError(400, "Message content cannot be empty");
  }

  const updatedMessage = await editMessageService(messageId, userId, content);

  logger.info(`Message ${messageId} edited by user ${userId}`);

  res
    .status(200)
    .json(new apiResponse(true, "Message edited successfully", updatedMessage));
});

export const getMessageByIdController = asyncHandler(async (req, res) => {
  const messageId = req.params.messageId;

  const message = await getMessageByIdService(messageId);

  if (!message) {
    throw new apiError(404, "Message not found");
  }

  logger.info(`Message ${messageId} retrieved`);

  res
    .status(200)
    .json(new apiResponse(true, "Message retrieved successfully", message));
});

export const bulkDeleteMessagesController = asyncHandler(async (req, res) => {
  const channelId = req.params.channelId;
  const userId = req.user.userId;
  const { messageIds } = req.body;

  if (!Array.isArray(messageIds) || messageIds.length === 0) {
    throw new apiError(400, "messageIds must be a non-empty array");
  }

  await bulkDeleteMessagesService(channelId, userId, messageIds);

  logger.info(
    `Bulk deleted messages in channel ${channelId} by user ${userId}`,
  );

  res.status(200).json(new apiResponse(true, "Messages deleted successfully"));
});

export const countMessagesByChannelIdController = asyncHandler(
  async (req, res) => {
    const channelId = req.params.channelId;

    const count = await countMessagesByChannelIdService(channelId);

    logger.info(`Counted messages in channel ${channelId}`);

    res.status(200).json(
      new apiResponse(true, "Message count retrieved successfully", {
        count,
      }),
    );
  },
);

export const searchMessagesInChannelController = asyncHandler(
  async (req, res) => {
    const channelId = req.params.channelId;
    const searchTerm = req.query.q;
    const limit = parseInt(req.query.limit) || 50;
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

export const pinMessageController = asyncHandler(async (req, res) => {
  const messageId = req.params.messageId;
  const userId = req.user.userId;

  const pinnedMessage = await pinMessageService(messageId, userId);

  logger.info(`Message ${messageId} pinned by user ${userId}`);

  res
    .status(200)
    .json(new apiResponse(true, "Message pinned successfully", pinnedMessage));
});

export const unpinMessageController = asyncHandler(async (req, res) => {
  const messageId = req.params.messageId;
  const userId = req.user.userId;

  const unpinnedMessage = await unpinMessageService(messageId, userId);

  logger.info(`Message ${messageId} unpinned by user ${userId}`);

  res
    .status(200)
    .json(
      new apiResponse(true, "Message unpinned successfully", unpinnedMessage),
    );
});

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
