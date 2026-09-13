import { z } from "zod";

const objectId = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, "Invalid MongoDB ID format");

const uuid = z.string().uuid("Invalid UUID format");

export const createChannelInvitationBodySchema = z.object({
  invitedUserId: uuid,
});

export const createChannelInvitationParamsSchema = z.object({
  channelId: objectId,
  workspaceId: uuid,
});

export const invitationParamsSchema = z.object({
  invitationId: objectId,
});

export const invitationQuerySchema = z.object({
  status: z.enum(["pending", "accepted", "rejected", "revoked"]).optional(),
});
