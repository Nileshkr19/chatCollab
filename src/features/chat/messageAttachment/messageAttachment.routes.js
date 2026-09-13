import express from "express";
import multer from "multer";
import validate from "@middleware/validate.middleware.js";
import {
  uploadAttachmentController,
  getMessageAttachmentsController,
  getChannelAttachmentsController,
  deleteAttachmentController,
  deleteMessageAttachmentsController,
} from "./messageAttachment.controller.js";
import {
  uploadAttachmentParamsSchema,
  messageAttachmentParamsSchema,
  channelAttachmentParamsSchema,
  attachmentParamsSchema,
  channelAttachmentsQuerySchema,
} from "./messageAttachment.validation.js";

const router = express.Router({ mergeParams: true });
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

router.post(
  "/:messageId",
  upload.single("file"),
  validate({
    params: uploadAttachmentParamsSchema,
  }),
  uploadAttachmentController,
);

router.get(
  "/message/:messageId",
  validate({
    params: messageAttachmentParamsSchema,
  }),
  getMessageAttachmentsController,
);

router.get(
  "/",
  validate({
    params: channelAttachmentParamsSchema,
    query: channelAttachmentsQuerySchema,
  }),
  getChannelAttachmentsController,
);

router.delete(
  "/:attachmentId",
  validate({
    params: attachmentParamsSchema,
  }),
  deleteAttachmentController,
);

router.delete(
  "/message/:messageId",
  validate({
    params: messageAttachmentParamsSchema,
  }),
  deleteMessageAttachmentsController,
);

export default router;
