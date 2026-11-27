import { z } from "zod";

// MongoDB ObjectId
const objectId = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, "Invalid MongoDB ID format");

// Workspace ID
const workspaceId = z.string().uuid("Invalid workspace ID format");

// Cursor validation
const cursorSchema = z
  .object({
    _id: objectId,
    createdAt: z.string().datetime(),
  })
  .strict();

// Pagination
const paginationQuery = {
  limit: z.coerce.number().int().min(1).max(100).default(50),

  cursor: z
    .string()
    .optional()
    .refine((value) => {
      if (!value) return true;

      try {
        cursorSchema.parse(JSON.parse(value));
        return true;
      } catch {
        return false;
      }
    }, "Invalid cursor format"),
};

// Message content
const messageContent = z
  .string()
  .trim()
  .min(1, "Message content cannot be empty")
  .max(5000, "Message content cannot exceed 5000 characters");

// Create message
export const createMessageSchema = z.object({
  content: messageContent,

  type: z.enum(["TEXT", "FILE", "IMAGE", "VIDEO", "AUDIO"]).default("TEXT"),

  parentId: objectId.nullable().optional(),
});

// Update message
export const updateMessageSchema = z.object({
  content: messageContent,
});

// Bulk delete messages
export const bulkDeleteMessagesSchema = z.object({
  messageIds: z
    .array(objectId)
    .min(1, "At least one message ID is required")
    .max(100, "Cannot delete more than 100 messages at once")
    .refine(
      (ids) => new Set(ids).size === ids.length,
      "Duplicate message IDs are not allowed",
    ),
});

// Route parameters
export const channelMessagesParamsSchema = z.object({
  workspaceId,
  channelId: objectId,
});

export const messageParamsSchema = z.object({
  workspaceId,
  messageId: objectId,
});

export const channelMessageParamsSchema = z.object({
  workspaceId,
  channelId: objectId,
  messageId: objectId,
});

// List messages
export const messageListQuerySchema = z.object(paginationQuery);

// Search messages
export const messageSearchQuerySchema = z.object({
  ...paginationQuery,

  q: z
    .string()
    .trim()
    .min(1, "Search term cannot be empty")
    .max(200, "Search term cannot exceed 200 characters"),
});
