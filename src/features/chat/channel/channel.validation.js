import { z } from "zod";

export const createChannelSchema = z.object({
  name: z.string().min(3).max(100),
  description: z.string().max(500).optional(),
  topic: z.string().max(100).optional(),
  isPrivate: z.boolean().optional(),
  avatarUrl: z.string().url().optional(),
  type: z.enum(["GROUP", "DIRECT"]).optional(),
});

export const updateChannelSchema = z.object({
  name: z.string().min(3).max(100).optional(),
  description: z.string().max(500).optional(),
  topic: z.string().max(100).optional(),
  isPrivate: z.boolean().optional(),
  avatarUrl: z.string().url().optional(),
});
