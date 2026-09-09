import { prisma } from "@config/connectPostgres.js";
import asyncHandler from "@utils/asyncHandler.js";
import apiError from "@utils/apiError.js";
import ChannelMember from "./member/channelMember.models.js";
import Channel from "./channel/channel.models.js";

// ============= Workspace Membership Check =============

/**
 * Verifies user is a member of the workspace
 * Sets: req.membership
 */
export const checkWorkspaceMembership = asyncHandler(async (req, res, next) => {
  const userId = req.user.userId;
  const { workspaceId } = req.params;

  const workspaceMembership = await prisma.workspaceMember.findUnique({
    where: {
      workspace_id_user_id: {
        workspace_id: workspaceId,
        user_id: userId,
      },
    },
    include: {
      workspace: {
        select: {
          id: true,
          deleted_at: true,
        },
      },
    },
  });

  if (!workspaceMembership || !workspaceMembership.is_active) {
    throw new apiError(403, "Access denied: Not a member of this workspace");
  }

  if (workspaceMembership.workspace.deleted_at) {
    throw new apiError(404, "Workspace not found");
  }

  req.membership = workspaceMembership;
  next();
});

// ============= Channel Membership Check =============

/**
 * Verifies user is a member of the channel
 * Requires: req.membership (from checkWorkspaceMembership)
 * Sets: req.channel, req.channelMembership
 */
export const checkChannelMembership = asyncHandler(async (req, res, next) => {
  const userId = req.user.userId;
  const { channelId } = req.params;
  const workspaceMembership = req.membership;

  if (!channelId) {
    throw new apiError(400, "Channel ID is required");
  }

  const [channelMember, channel] = await Promise.all([
    ChannelMember.findOne({
      channelId,
      userId,
      isRemoved: false,
    }).lean(),
    Channel.findById(channelId)
      .select("_id name type workspaceId isArchived isRemoved isPrivate")
      .lean(),
  ]);

  if (!channel) {
    throw new apiError(404, "Channel not found");
  }

  if (!channelMember) {
    if (channel.isPrivate) {
      throw new apiError(403, "You are not a member of this private channel");
    }

    if (!["OWNER", "MANAGER"].includes(workspaceMembership.role)) {
      throw new apiError(
        403,
        "You must be a member of the channel to perform this action",
      );
    }
  }

  req.channel = channel;
  req.channelMembership = channelMember;
  next();
});

// ============= Manager/Permission Checks =============

/**
 * Verifies user is workspace OWNER or MANAGER
 * Requires: req.membership
 */
export const isWorkspaceOwnerOrManager = asyncHandler(
  async (req, res, next) => {
    const workspaceRole = req.membership?.role;

    if (!["OWNER", "MANAGER"].includes(workspaceRole)) {
      throw new apiError(
        403,
        "Insufficient permissions: Only owners or managers can perform this action",
      );
    }
    next();
  },
);

/**
 * Verifies user is CHANNEL ADMIN or MANAGER
 * Requires: req.channelMembership (from checkChannelMembership)
 */
export const isChannelAdminOrManager = asyncHandler(async (req, res, next) => {
  const channelRole = req.channelMembership?.role;

  if (!["ADMIN", "MANAGER"].includes(channelRole)) {
    throw new apiError(
      403,
      "Insufficient permissions: Only channel admins or managers can perform this action",
    );
  }
  next();
});

/*
 * Verifies user is EITHER workspace OWNER/MANAGER OR channel ADMIN/MANAGER
 * Requires: req.membership, req.channelMembership
 * @deprecated - Use isWorkspaceOwnerOrManager or isChannelAdminOrManager separately
 */
export const isManagerOrChannelAdmin = asyncHandler(async (req, res, next) => {
  const workspaceRole = req.membership?.role;
  const channelRole = req.channelMembership?.role;

  // Allow if workspace manager
  if (["OWNER", "MANAGER"].includes(workspaceRole)) {
    return next();
  }

  // Allow if channel admin
  if (["ADMIN", "MANAGER"].includes(channelRole)) {
    return next();
  }

  throw new apiError(
    403,
    "Insufficient permissions: Only managers or channel admins can perform this action",
  );
});

// ============= Channel State Checks =============

/**
 * Verifies channel is not archived
 * Requires: req.channel
 */
export const checkChannelNotArchived = asyncHandler(async (req, res, next) => {
  const channel = req.channel;

  if (!channel || channel.isArchived) {
    throw new apiError(410, "Cannot perform operation on archived channel");
  }
  next();
});

/**
 * Verifies channel is not removed
 * Requires: req.channel
 */
export const checkChannelNotRemoved = asyncHandler(async (req, res, next) => {
  const channel = req.channel;

  if (!channel || channel.isRemoved) {
    throw new apiError(404, "Channel not found");
  }
  next();
});
