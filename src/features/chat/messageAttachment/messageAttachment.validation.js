import { z } from "zod";

const objectId = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, "Invalid MongoDB ID format");

const workspaceId = z.string().uuid("Invalid workspace ID format");

export const uploadAttachmentParamsSchema = z.object({
  workspaceId,
  channelId: objectId,
  messageId: objectId,
});

export const messageAttachmentParamsSchema = z.object({
  workspaceId,
  messageId: objectId,
});

export const channelAttachmentParamsSchema = z.object({
  workspaceId,
  channelId: objectId,
});

export const attachmentParamsSchema = z.object({
  workspaceId,
  attachmentId: objectId,
});

export const channelAttachmentsQuerySchema = z.object({
  fileType: z
    .enum(["IMAGE", "VIDEO", "AUDIO", "DOCUMENT", "OTHER"])
    .optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: objectId.optional(),
});
