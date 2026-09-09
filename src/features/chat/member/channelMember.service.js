import ChannelMember from "./channelMember.models.js";
import logger from "@utils/logger.js";
import Channel from "../channel/channel.models.js";
import { prisma } from "@config/connectPostgres.js";

// Check if a target user is an active member of the workspace
const workspaceMemberExists = async (workspaceId, targetUserId) => {
  const workspaceMember = await prisma.workspaceMember.findUnique({
    where: {
      workspace_id_user_id: {
        workspace_id: workspaceId,
        user_id: targetUserId,
      },
    },
    select: {
      is_active: true,
    },
  });
  return workspaceMember;
};

// Self action check to prevent users from performing actions on themselves
const selfActionCheck = (actionBy, targetUserId) => {
  if (actionBy === targetUserId) {
    const error = new Error("You cannot perform this action on yourself");
    error.statusCode = 400;
    throw error;
  }
};

// check target user is a member of the channel and not removed
const channelMemberExists = async (channelId, targetUserId) => {
  const channelMember = await ChannelMember.findOne({
    channelId,
    userId: targetUserId,
  }).lean();
  return channelMember;
};

export const addChannelMemberService = async (
  workspaceId,
  channelId,
  addedBy,
  targetUserId,
) => {
  const workspaceMember = await workspaceMemberExists(
    workspaceId,
    targetUserId,
  );

  if (!workspaceMember || !workspaceMember.is_active) {
    const error = new Error("User is not a member of the workspace");
    error.statusCode = 400;
    throw error;
  }

  const channel = await Channel.findOne({
    _id: channelId,
    workspaceId,
  });
  if (!channel || channel.isRemoved) {
    const error = new Error("Channel not found");
    error.statusCode = 404;
    throw error;
  }
  if (channel.isPrivate) {
    const error = new Error(
      "Cannot add members to a private channel. Please send an invitation instead.",
    );
    error.statusCode = 400;
    throw error;
  }

  selfActionCheck(addedBy, targetUserId);

  const existingMember = await channelMemberExists(channelId, targetUserId);

  if (existingMember && !existingMember.isRemoved) {
    const error = new Error("User is already a member of the channel");
    error.statusCode = 400;
    throw error;
  }

  // Re-activate if member exists and was removed
  if (existingMember && existingMember.isRemoved) {
    const [reactivated] = await Promise.all([
      ChannelMember.findOneAndUpdate(
        { channelId, userId: targetUserId },
        {
          isRemoved: false,
          removedBy: null,
          role: "MEMBER",
          joinedAt: new Date(),
          isMuted: false,
          mutedUntil: null,
        },
        { new: true },
      ).lean(),

      Channel.findByIdAndUpdate(channelId, { $inc: { memberCount: 1 } }),
    ]);

    logger.info(
      `User ${targetUserId} re-added to channel ${channelId} by user ${addedBy}`,
    );

    return reactivated;
  }

  // Create new member if doesn't exist
  const newMember = await Promise.all([
    ChannelMember.create({
      channelId,
      userId: targetUserId,
      role: "MEMBER",
      joinedAt: new Date(),
      invitedBy: addedBy,
    }),
    Channel.findByIdAndUpdate(channelId, { $inc: { memberCount: 1 } }),
  ]);

  logger.info(
    `User ${targetUserId} added to channel ${channelId} by user ${addedBy}`,
  );

  return newMember;
};

export const removeChannelMemberService = async (
  workspaceId,
  channelId,
  removedBy,
  targetUserId,
) => {
  const worspaceMember = await workspaceMemberExists(workspaceId, targetUserId);
  if (!worspaceMember || !worspaceMember.is_active) {
    const error = new Error("User is not a member of the workspace");
    error.statusCode = 400;
    throw error;
  }

  selfActionCheck(removedBy, targetUserId);

  const channelMember = await channelMemberExists(channelId, targetUserId);
  if (!channelMember || channelMember.isRemoved) {
    const error = new Error("User is not a member of the channel");
    error.statusCode = 400;
    throw error;
  }
  if (channelMember.role === "ADMIN") {
    const adminCount = await ChannelMember.countDocuments({
      channelId,
      role: "ADMIN",
    });
    if (adminCount <= 1) {
      const error = new Error(
        "Cannot remove the last admin. Please assign another admin before removing this member.",
      );
      error.statusCode = 400;
      throw error;
    }
  }

  const [removedMember] = await Promise.all([
    ChannelMember.findOneAndUpdate(
      {
        channelId,
        userId: targetUserId,
      },
      {
        isRemoved: true,
        removedBy,
      },
      {
        new: true,
      },
    ).lean(),

    Channel.findByIdAndUpdate(channelId, { $inc: { memberCount: -1 } }),
  ]);

  logger.info(
    `User ${targetUserId} removed from channel ${channelId} by user ${removedBy}`,
  );

  return removedMember;
};

export const updateChannelMemberRoleService = async (
  workspaceId,
  channelId,
  targetUserId,
  newRole,
  updatedBy,
) => {
  const workspaceMember = await workspaceMemberExists(
    workspaceId,
    targetUserId,
  );
  if (!workspaceMember || !workspaceMember.is_active) {
    const error = new Error("User is not a member of the workspace");
    error.statusCode = 400;
    throw error;
  }

  selfActionCheck(updatedBy, targetUserId);

  const channelMember = await channelMemberExists(channelId, targetUserId);

  if (!channelMember || channelMember.isRemoved) {
    const error = new Error("User is not a member of the channel");
    error.statusCode = 400;
    throw error;
  }

  const updatedRole = await ChannelMember.findOneAndUpdate(
    {
      channelId,
      userId: targetUserId,
    },
    {
      role: newRole,
    },
  ).lean();

  if (!updatedRole) {
    const error = new Error("Failed to update member role");
    error.statusCode = 500;
    throw error;
  }

  logger.info(
    `User ${targetUserId} role updated to ${newRole} in channel ${channelId} by user ${updatedBy}`,
  );

  return updatedRole;
};

export const transferChannelOwnershipService = async (
  workspaceId,
  channelId,
  newOwnerId,
  transferedBy,
) => {
  const workspaceMember = await workspaceMemberExists(workspaceId, newOwnerId);

  if (!workspaceMember || !workspaceMember.is_active) {
    const error = new Error(`${newOwnerId} is not a member of the workspace`);
    error.statusCode = 400;
    throw error;
  }

  selfActionCheck(transferedBy, newOwnerId);

  const channelMember = await channelMemberExists(channelId, newOwnerId);

  if (!channelMember || channelMember.isRemoved) {
    const error = new Error(`${newOwnerId} is not a member of the channel`);
    error.statusCode = 400;
    throw error;
  }

  if (channelMember.role === "ADMIN") {
    const error = new Error("User is already the channel owner");
    error.statusCode = 400;
    throw error;
  }

  const adminCount = await ChannelMember.countDocuments({
    channelId,
    role: "ADMIN",
  });

  if (adminCount <= 1) {
    const error = new Error(
      "Cannot transfer ownership as there is only one admin. Please assign another admin before transferring ownership.",
    );
    error.statusCode = 400;
    throw error;
  }

  const updatedOwner = await ChannelMember.findOneAndUpdate(
    {
      channelId,
      userId: newOwnerId,
    },
    {
      role: "ADMIN",
    },
  ).lean();

  if (!updatedOwner) {
    const error = new Error("Failed to transfer channel ownership");
    error.statusCode = 500;
    throw error;
  }

  logger.info(
    `Channel ${channelId} ownership transferred to user ${newOwnerId} by user ${transferedBy}`,
  );

  return updatedOwner;
};

export const leaveChannelService = async (
  channelId,
  channelMembership,
  userId,
) => {
  if (channelMembership.role === "ADMIN") {
    const adminCount = await ChannelMember.countDocuments({
      channelId,
      role: "ADMIN",
    });

    if (adminCount <= 1) {
      const error = new Error(
        "Cannot leave the channel as you are the last admin. Please assign another admin before leaving.",
      );
      error.statusCode = 400;
      throw error;
    }
  }

  const leftMember = await ChannelMember.findOneAndUpdate(
    {
      channelId,
      userId,
    },
    {
      isRemoved: true,
      removedBy: userId,
    },
    {
      new: true,
    },
  ).lean();

  if (!leftMember) {
    const error = new Error("You are not a member of this channel");
    error.statusCode = 404;
    throw error;
  }

  await Channel.findByIdAndUpdate(channelId, { $inc: { memberCount: -1 } });

  logger.info(`User ${userId} left channel ${channelId}`);

  return leftMember;
};
