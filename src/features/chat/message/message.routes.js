import express from "express";
import validate from "@middleware/validate.middleware.js";

import {
  createMessageController,
  getMessagesByChannelIdController,
  deleteMessageController,
  editMessageController,
  getMessageByIdController,
  bulkDeleteMessagesController,
  countMessagesByChannelIdController,
  searchMessagesInChannelController,
  pinMessageController,
  unpinMessageController,
  getPinnedMessagesByChannelIdController,
} from "@features/chat/message/message.controller.js";

import {
  createMessageSchema,
  updateMessageSchema,
  channelMessagesParamsSchema,
  channelMessageParamsSchema,
  messageListQuerySchema,
  messageSearchQuerySchema,
  bulkDeleteMessagesSchema,
} from "@features/chat/message/message.validation.js";

import {
  checkWorkspaceMembership,
  checkChannelMembership,
  checkChannelNotArchived,
} from "@features/chat/chat.middleware.js";

import { checkPermission } from "@common/permission/permission.middleware.js";

import Message from "@features/chat/message/message.models.js";

import apiError from "@utils/apiError";

const router = express.Router({ mergeParams: true });

// Validate workspace and channel parameters
router.use(validate({ params: channelMessagesParamsSchema }));

// Check workspace and channel membership
router.use(checkWorkspaceMembership);
router.use(checkChannelMembership);

// Create message
router.post(
  "/",
  checkChannelNotArchived,
  checkPermission("messages.send"),
  validate({
    body: createMessageSchema,
  }),
  createMessageController,
);

// Get all messages
router.get(
  "/",
  validate({
    query: messageListQuerySchema,
  }),
  getMessagesByChannelIdController,
);

// Bulk delete messages
router.delete(
  "/bulk-delete",
  validate({
    body: bulkDeleteMessagesSchema,
  }),
  bulkDeleteMessagesController,
);

// Count messages
router.get("/count", countMessagesByChannelIdController);

// Search messages
router.get(
  "/search",
  validate({
    query: messageSearchQuerySchema,
  }),
  searchMessagesInChannelController,
);

// Pin message
router.post(
  "/:messageId/pin",
  checkChannelNotArchived,
  validate({
    params: channelMessageParamsSchema,
  }),
  checkPermission("messages.pin"),
  pinMessageController,
);

// Unpin message
router.post(
  "/:messageId/unpin",
  checkChannelNotArchived,
  validate({
    params: channelMessageParamsSchema,
  }),
  checkPermission("messages.pin"),
  unpinMessageController,
);

// Get pinned messages
router.get("/pinned", getPinnedMessagesByChannelIdController);

// Edit message
router.patch(
  "/:messageId",
  checkChannelNotArchived,
  validate({
    params: channelMessageParamsSchema,
    body: updateMessageSchema,
  }),
  checkPermission("messages.editOwn", {
    ownershipKey: "messages.editAll",

    getOwnerId: async (req) => {
      const message = await Message.findOne({
        _id: req.params.messageId,
        channelId: req.params.channelId,
        isDeleted: false,
      })
        .select("senderId")
        .lean();

      if (!message) {
        throw new apiError(404, "Message not found");
      }

      return message.senderId;
    },
  }),
  editMessageController,
);

// Get message by ID
router.get(
  "/:messageId",
  validate({
    params: channelMessageParamsSchema,
  }),
  getMessageByIdController,
);

// Delete message
router.delete(
  "/:messageId",
  validate({
    params: channelMessageParamsSchema,
  }),
  checkPermission("messages.deleteOwn", {
    ownershipKey: "messages.deleteAll",
    getOwnerId: async (req) => {
      const message = await Message.findOne({
        _id: req.params.messageId,
        channelId: req.params.channelId,
        isDeleted: false,
      })
        .select("senderId")
        .lean();

      if (!message) {
        throw new apiError(404, "Message not found");
      }

      return message?.senderId;
    },
  }),
  deleteMessageController,
);

export default router;
