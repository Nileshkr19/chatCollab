import express from "express";
import {
  checkChannelMembership,
  checkWorkspaceMembership,
  isWorkspaceOwnerOrManager,
  isManagerOrChannelAdmin,
  checkChannelNotArchived,
  checkChannelNotRemoved,
} from "../chat.middleware.js";
import { validate } from "@middleware/validate.middleware.js";
import {
  createChannelController,
  getChannelController,
  getWorkspaceChannelsController,
  updateChannelController,
  deleteChannelController,
  archiveChannelController,
  unArchiveChannelController,
} from "./channel.controller.js";
import {
  createChannelSchema,
  updateChannelSchema,
} from "./channel.validation.js";

const router = express.Router({ mergeParams: true });

// ============= Channel Management Routes =============

/**
 * Create Channel
 * POST /workspaces/:workspaceId/channels
 */
router.post(
  "/",
  checkWorkspaceMembership,
  isWorkspaceOwnerOrManager,
  validate(createChannelSchema),
  createChannelController,
);

/**
 * Get All Workspace Channels
 * GET /workspaces/:workspaceId/channels
 */
router.get("/", checkWorkspaceMembership, getWorkspaceChannelsController);

/**
 * Get Channel Details
 * GET /workspaces/:workspaceId/channels/:channelId
 */
router.get(
  "/:channelId",
  checkWorkspaceMembership,
  checkChannelNotRemoved,
  checkChannelMembership,
  getChannelController,
);

/**
 * Update Channel
 * PATCH /workspaces/:workspaceId/channels/:channelId
 * Allowed: Workspace OWNER/MANAGER or Channel ADMIN/MANAGER
 */
router.patch(
  "/:channelId",
  checkWorkspaceMembership,
  checkChannelNotRemoved,
  checkChannelNotArchived,
  checkChannelMembership,
  isManagerOrChannelAdmin,
  validate(updateChannelSchema),
  updateChannelController,
);

/**
 * Delete Channel (Soft Delete)
 * DELETE /workspaces/:workspaceId/channels/:channelId
 */
router.delete(
  "/:channelId",
  checkWorkspaceMembership,
  isWorkspaceOwnerOrManager,
  checkChannelNotRemoved,
  deleteChannelController,
);

/**
 * Archive Channel
 * PATCH /workspaces/:workspaceId/channels/:channelId/archive
 * Allowed: Workspace OWNER/MANAGER or Channel ADMIN/MANAGER
 */
router.patch(
  "/:channelId/archive",
  checkWorkspaceMembership,
  checkChannelNotRemoved,
  checkChannelNotArchived,
  checkChannelMembership,
  isManagerOrChannelAdmin,
  archiveChannelController,
);

/**
 * Unarchive Channel
 * PATCH /workspaces/:workspaceId/channels/:channelId/unarchive
 * Allowed: Workspace OWNER/MANAGER or Channel ADMIN/MANAGER
 */
router.patch(
  "/:channelId/unarchive",
  checkWorkspaceMembership,
  checkChannelNotRemoved,
  checkChannelMembership,
  isManagerOrChannelAdmin,
  unArchiveChannelController,
);

export default router;
