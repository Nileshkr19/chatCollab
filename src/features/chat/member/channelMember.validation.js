import { z } from "zod";

export const addChannelMemberSchema = z.object({
  targetUserId: z.string().uuid(),
});

export const removeChannelMemberSchema = z.object({
  targetUserId: z.string().uuid(),
});

export const updateChannelMemberRoleSchema = z.object({
  targetUserId: z.string().uuid(),
  newRole: z.enum(["ADMIN", "MANAGER", "MEMBER"]),
});

export const transferChannelOwnershipSchema = z.object({
  newOwnerId: z.string().uuid(),
});

