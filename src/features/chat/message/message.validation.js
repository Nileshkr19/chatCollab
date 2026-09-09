import { z } from "zod";

const objectId = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, "Invalid MongoDB ID format");

const paginationQuery = {
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z
    .string()
    .refine(
      (value) => {
        try {
          const cursor = JSON.parse(value);
          return (
            typeof cursor === "object" &&
            cursor !== null &&
            objectId.safeParse(cursor._id).success &&
            typeof cursor.createdAt === "string" &&
            !Number.isNaN(Date.parse(cursor.createdAt))
          );
        } catch {
          return false;
        }
      },
      "Invalid cursor format",
    )
    .optional(),
};

const messageContent = z
  .string()
  .trim()
  .min(1, "Message content cannot be empty")
  .max(5000, "Message content cannot exceed 5000 characters");

export const createMessageSchema = z.object({
  content: messageContent,
  type: z.enum(["TEXT", "FILE", "IMAGE", "VIDEO", "AUDIO"]).default("TEXT"),
  parentId: objectId.nullable().optional(),
});

export const updateMessageSchema = z.object({
  content: messageContent,
});

export const bulkDeleteMessagesSchema = z.object({
  messageIds: z
    .array(objectId)
    .min(1, "messageIds must contain at least one message ID"),
});

export const channelMessagesParamsSchema = z.object({
  channelId: objectId,
});

export const messageParamsSchema = z.object({
  messageId: objectId,
});

export const channelMessageParamsSchema = z.object({
  channelId: objectId,
  messageId: objectId,
});

export const messageListQuerySchema = z.object(paginationQuery);

export const messageSearchQuerySchema = z.object({
  ...paginationQuery,
  q: z.string().trim().min(1, "Search term cannot be empty"),
});
