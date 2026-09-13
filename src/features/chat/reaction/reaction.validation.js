import { z } from "zod";

const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid ObjectId format");

export const reactionMessageParamsSchema = z.object({
  messageId: objectId,
});

export const reactionBodySchema = z.object({
  emoji: z.string().trim().min(1, "Emoji is required").max(32),
});

export const reactionEmojiParamsSchema = z.object({
  messageId: objectId,
  emoji: z.string().trim().min(1).max(32),
});
