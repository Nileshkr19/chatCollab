import asyncHandler from "@utils/asyncHandler.js";
import apiError from "@utils/apiError.js";
import apiResponse from "@utils/apiResponse.js";
import {
  uploadAttachmentService,
  getMessageAttachmentsService,
  getChannelAttachmentsService,
  deleteAttachmentService,
  deleteMessageAttachmentsService,
} from "./messageAttachment.service.js";

export const uploadAttachmentController = asyncHandler(async (req, res) => {
  const file = req.file;
  if (!file) {
    throw new apiError(400, "File is required");
  }

  const { channelId, messageId, workspaceId } = req.params;
  const uploadedBy = req.user.userId;

  const attachment = await uploadAttachmentService(
    file,
    channelId,
    messageId,
    workspaceId,
    uploadedBy,
  );

  return res
    .status(201)
    .json(new apiResponse(201, attachment, "Attachment uploaded successfully"));
});

export const getMessageAttachmentsController = asyncHandler(
  async (req, res) => {
    const { messageId } = req.params;

    const attachments = await getMessageAttachmentsService(messageId);

    return res
      .status(200)
      .json(
        new apiResponse(
          200,
          attachments,
          "Message attachments retrieved successfully",
        ),
      );
  },
);

export const getChannelAttachmentsController = asyncHandler(
  async (req, res) => {
    const { channelId } = req.params;
    const { fileType, limit, cursor } = req.query;

    const attachments = await getChannelAttachmentsService(channelId, {
      fileType,
      limit,
      cursor,
    });

    return res
      .status(200)
      .json(
        new apiResponse(
          200,
          attachments,
          "Channel attachments retrieved successfully",
        ),
      );
  },
);

export const deleteAttachmentController = asyncHandler(async (req, res) => {
  const { attachmentId } = req.params;
  const deletedBy = req.user.userId;

  await deleteAttachmentService(attachmentId, deletedBy);

  return res
    .status(200)
    .json(new apiResponse(200, null, "Attachment deleted successfully"));
});

export const deleteMessageAttachmentsController = asyncHandler(
  async (req, res) => {
    const { messageId } = req.params;
    const deletedBy = req.user.userId;

    await deleteMessageAttachmentsService(messageId, deletedBy);

    return res
      .status(200)
      .json(
        new apiResponse(200, null, "Message attachments deleted successfully"),
      );
  },
);
