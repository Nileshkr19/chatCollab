import { z } from "zod";

const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid channel ID");

export const setPresenceSchema = z.object({
  params: z.object({
    workspaceId: z.string().uuid("Invalid workspace ID"),
    channelId: objectId,
  }),
  body: z.object({
    status: z.enum(["online", "away", "offline"]),
  }),
});

export const workspacePresenceParamsSchema = z.object({
  workspaceId: z.string().uuid("Invalid workspace ID"),
});