import { stroageProvider } from "@config/storage.js";
import MessageAttachment from "./messageAttachment.models.js";
import Message from "../message/message.models.js";
import logger from "@utils/logger.js";
import { v4 as uuidv4 } from "uuid";
import { prisma } from "@config/connectPostgres.js";
import path from "path";

const determineFileType = (mimeType) => {
  if (mimeType.startsWith("image/")) return "IMAGE";
  if (mimeType.startsWith("video/")) return "VIDEO";
  if (mimeType.startsWith("audio/")) return "AUDIO";
  if (mimeType.startsWith("application") || mimeType.startsWith("text"))
    return "DOCUMENT";
  return "OTHER";
};

const generateStorageKey = (workspaceId, channelId, originalName) => {
  const ext = path.extname(originalName);
  const safeName = path
    .basename(originalName, ext)
    .replace(/[^a-zA-Z0-9-_]/g, "_")
    .slice(0, 50) // Limit to 50 chars
    .toLowerCase();

  return `${workspaceId}/${channelId}/${uuidv4()}-${safeName}${ext}`;
};

export const uploadAttachmentService = async (
  file,
  channelId,
  messageId,
  workspaceId,
  uploadedBy,
) => {
  const key = generateStorageKey(workspaceId, channelId, file.originalname);
  const fileType = determineFileType(file.mimetype);

  const [uploadResult] = await Promise.all([
    stroageProvider.upload(key, file.buffer, file.mimetype),
    Message.findByIdAndUpdate(messageId, {
      $inc: { attachmentCount: 1 },
      $set: { hasAttachments: true },
    }),
  ]);

  const publicUrl = stroageProvider.getPublicUrl(key);

  const attachment = await MessageAttachment.create({
    messageId,
    channelId,
    workspaceId,
    uploadedBy,
    url: publicUrl,
    name: file.originalname,
    size: file.size,
    mimeType: file.mimetype,
    key,
    fileType,
  });
  logger.info(`Attachment uploaded: ${key} for message ${messageId}`);
  return attachment;
};

export const getMessageAttachmentsService = async (messageId) => {
  const attachments = await MessageAttachment.find({
    messageId,
    isDeleted: false,
  })
    .select("url name size mimeType fileType createdAt uploadedBy")
    .sort({ createdAt: 1 });
  return attachments;
};

export const getChannelAttachmentsService = async (
  channelId,
  { fileType, limit = 20, cursor },
) => {
  const query = {
    channelId,
    isDeleted: false,
  };
  if (fileType) {
    query.fileType = fileType;
  }
  if (cursor) {
    query._id = { $lt: cursor };
  }

  const attachments = await MessageAttachment.find(query)
    .select("url name size mimeType fileType createdAt uploadedBy")
    .sort({ createdAt: -1 })
    .limit(limit + 1)
    .lean();

  const hasMore = attachments.length > limit;
  const result = hasMore ? attachments.slice(0, limit) : attachments;

  const uploaderId = [...new Set(result.map((att) => att.uploadedBy))];

  const uploaders = await prisma.user.findMany({
    where: { id: { in: uploaderId } },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      username: true,
      avatar_url: true,
    },
  });

  const uploaderMap = uploaders.reduce((acc, user) => {
    acc[user.id] = user;
    return acc;
  }, {});

  const attachmentsWithUploader = result.map((att) => ({
    ...att,
    uploader: uploaderMap[att.uploadedBy] || null,
  }));

  return {
    attachments: attachmentsWithUploader,
    hasMore,
    nextCursor: hasMore ? result[result.length - 1]._id : null,
  };
};

export const deleteAttachmentService = async (attachmentId, deletedBy) => {
  const attachment = await MessageAttachment.findById(attachmentId);
  if (!attachment || attachment.isDeleted) {
    const err = new Error("Attachment not found or already deleted");
    err.status = 404;
    throw err;
  }

  await Promise.all([
    stroageProvider.delete(attachment.key),
    MessageAttachment.findByIdAndUpdate(attachmentId, {
      isDeleted: true,
      deletedBy,
    }),
    Message.findByIdAndUpdate(attachment.messageId, {
      $inc: { attachmentCount: -1 },
      $set: { hasAttachments: attachment.attachmentCount > 1 },
    }),
  ]);

  logger.info(`Attachment deleted: ${attachment.key} by user ${deletedBy}`);
  return { success: true, message: "Attachment deleted successfully" };
};

export const deleteMessageAttachmentsService = async (messageId, deletedBy) => {
  const attachments = await MessageAttachment.find({
    messageId,
    isDeleted: false,
  })
    .select("_id key")
    .lean();
  if (attachments.length === 0) {
    return { success: true, message: "No attachments to delete" };
  }

  const keys = attachments.map((att) => att.key);

  await Promise.all([
    stroageProvider.deleteMany(keys),
    MessageAttachment.updateMany(
      { messageId, isDeleted: false },
      { isDeleted: true, deletedBy },
    ),
  ]);
  logger.info(
    `All attachments deleted for message ${messageId} by user ${deletedBy}`,
  );
  return { success: true, message: "All attachments deleted successfully" };
};
