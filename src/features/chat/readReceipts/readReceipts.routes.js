import express from "express";
import validate from "@middleware/validate.middleware.js";
import {
  createReadReceiptController,
  getReadReceiptController,
  getUnreadCountController,
  updateLastReadMessageController,
  deleteReadReceiptController,
  getChannelReadStatusController,
} from "./readReceipts.controller.js";
import {
  channelMessagesParamsSchema,
  channelMessageParamsSchema,
} from "../message/message.validation.js";
import {
  checkChannelMembership,
  checkWorkspaceMembership,
} from "../chat.middleware.js";

const router = express.Router({ mergeParams: true });

const channelAccess = [checkWorkspaceMembership, checkChannelMembership];

router.post(
  "/",
  ...channelAccess,
  validate({ params: channelMessagesParamsSchema }),
  createReadReceiptController,
);

router.get(
  "/",
  ...channelAccess,
  validate({ params: channelMessagesParamsSchema }),
  getReadReceiptController,
);

router.get(
  "/unread-count",
  ...channelAccess,
  validate({ params: channelMessagesParamsSchema }),
  getUnreadCountController,
);

router.get(
  "/status",
  ...channelAccess,
  validate({ params: channelMessagesParamsSchema }),
  getChannelReadStatusController,
);

router.patch(
  "/messages/:messageId",
  ...channelAccess,
  validate({ params: channelMessageParamsSchema }),
  updateLastReadMessageController,
);

router.delete(
  "/",
  ...channelAccess,
  validate({ params: channelMessagesParamsSchema }),
  deleteReadReceiptController,
);

export default router;
