import asyncHandler from "../../utils/asyncHandler.js";
import apiError from "../../utils/apiError.js";

import ChannelMember from "./member/channelMember.models.js";
import Channel from "./channel/channel.models.js";

import { getWorkspaceMembership } from "../workspace/workspace-access.service.js";

// ============= Workspace Membership Check =============

/**
 * Verifies that the authenticated user is an active workspace member.
 *
 * Requires:
 *   req.user.userId
 *   req.params.workspaceId
 *
 * Sets:
 *   req.membership
 */
export const checkWorkspaceMembership = asyncHandler(async (req, res, next) => {
  const userId = req.user.userId;
  const { workspaceId } = req.params;

  const workspaceMembership = await getWorkspaceMembership(workspaceId, userId);

  if (!workspaceMembership) {
    throw new apiError(403, "Access denied: Not a member of this workspace");
  }

  // Assumes getWorkspaceMembership populates the workspace field.
  if (workspaceMembership.workspace?.deleted_at) {
    throw new apiError(404, "Workspace not found");
  }

  if (!workspaceMembership.is_active) {
    throw new apiError(403, "Access denied: Not a member of this workspace");
  }

  req.membership = workspaceMembership;

  next();
});

// ============= Channel Membership Check =============

/**
 * Verifies that the authenticated user can access the channel.
 *
 * Requires:
 *   req.membership (from checkWorkspaceMembership)
 *
 * Sets:
 *   req.channel
 *   req.channelMembership
 */
export const checkChannelMembership = asyncHandler(async (req, res, next) => {
  const userId = req.user.userId;
  const { channelId, workspaceId } = req.params;
  const workspaceMembership = req.membership;

  if (!channelId) {
    throw new apiError(400, "Channel ID is required");
  }

  if (!workspaceMembership) {
    throw new apiError(500, "Workspace membership was not initialized");
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

  // 1. Verify channel existence.
  if (!channel) {
    throw new apiError(404, "Channel not found");
  }

  // 2. Verify channel belongs to the requested workspace.
  if (String(channel.workspaceId) !== String(workspaceId)) {
    throw new apiError(404, "Channel not found in this workspace");
  }

  // 3. Prevent access to removed channels.
  if (channel.isRemoved) {
    throw new apiError(404, "Channel not found");
  }

  // 4. Workspace OWNER can access every channel.
  if (workspaceMembership.role === "OWNER") {
    req.channel = channel;
    req.channelMembership = channelMember;

    return next();
  }

  // 5. Check channel membership for other workspace roles.
  if (!channelMember) {
    // Private channels require explicit channel membership.
    if (channel.isPrivate) {
      throw new apiError(403, "You are not a member of this private channel");
    }

    // Workspace MANAGER can access public channels.
    if (workspaceMembership.role !== "MANAGER") {
      throw new apiError(
        403,
        "You must be a member of the channel to perform this action",
      );
    }
  }

  // 6. Attach channel information to request.
  req.channel = channel;
  req.channelMembership = channelMember;

  next();
});

// ============= Workspace Role Checks =============

/**
 * Verifies user is workspace OWNER or MANAGER.
 *
 * Requires:
 *   req.membership
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

// ============= Channel Role Checks =============

/**
 * Verifies user is channel ADMIN or MANAGER.
 *
 * Requires:
 *   req.channelMembership
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

// ============= Deprecated Role Check =============

/**
 * @deprecated
 * Use isWorkspaceOwnerOrManager or isChannelAdminOrManager separately.
 */
export const isManagerOrChannelAdmin = asyncHandler(async (req, res, next) => {
  const workspaceRole = req.membership?.role;
  const channelRole = req.channelMembership?.role;

  if (
    ["OWNER", "MANAGER"].includes(workspaceRole) ||
    ["ADMIN", "MANAGER"].includes(channelRole)
  ) {
    return next();
  }

  throw new apiError(
    403,
    "Insufficient permissions: Only managers or channel admins can perform this action",
  );
});

// ============= Channel State Checks =============

/**
 * Prevents operations on archived channels.
 *
 * Requires:
 *   req.channel
 */
export const checkChannelNotArchived = asyncHandler(async (req, res, next) => {
  const channel = req.channel;

  if (!channel) {
    throw new apiError(404, "Channel not found");
  }

  if (channel.isArchived) {
    throw new apiError(410, "Cannot perform operation on archived channel");
  }

  next();
});

/**
 * Prevents operations on removed channels.
 *
 * Requires:
 *   req.channel
 */
export const checkChannelNotRemoved = asyncHandler(async (req, res, next) => {
  const channel = req.channel;

  if (!channel || channel.isRemoved) {
    throw new apiError(404, "Channel not found");
  }

  next();
});
