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

const router = express.Router({ mergeParams: true });

router.post(
  "/",
  validate({
    params: channelMessagesParamsSchema,
    body: createMessageSchema,
  }),
  createMessageController,
);

router.get(
  "/",
  validate({
    params: channelMessagesParamsSchema,
    query: messageListQuerySchema,
  }),
  getMessagesByChannelIdController,
);

router.delete(
  "/bulk-delete",
  validate({
    params: channelMessagesParamsSchema,
    body: bulkDeleteMessagesSchema,
  }),
  bulkDeleteMessagesController,
);

router.get(
  "/count",
  validate({
    params: channelMessagesParamsSchema,
  }),
  countMessagesByChannelIdController,
);

router.get(
  "/search",
  validate({
    params: channelMessagesParamsSchema,
    query: messageSearchQuerySchema,
  }),
  searchMessagesInChannelController,
);

router.post(
  "/:messageId/pin",
  validate({
    params: channelMessageParamsSchema,
  }),
  pinMessageController,
);

router.post(
  "/:messageId/unpin",
  validate({
    params: channelMessageParamsSchema,
  }),
  unpinMessageController,
);

router.get(
  "/pinned",
  validate({
    params: channelMessagesParamsSchema,
  }),
  getPinnedMessagesByChannelIdController,
);

router.patch(
  "/:messageId",
  validate({
    params: channelMessageParamsSchema,
    body: updateMessageSchema,
  }),
  editMessageController,
);

router.get(
  "/:messageId",
  validate({
    params: channelMessageParamsSchema,
  }),
  getMessageByIdController,
);

router.delete(
  "/:messageId",
  validate({
    params: channelMessageParamsSchema,
  }),
  deleteMessageController,
);

export default router;
