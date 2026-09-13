import express from "express";
import {protect}  from "../auth/auth.middleware.js";
import channelRoutes from "./channel/channel.routes.js";
import memberRoutes from "./member/channelMember.routes.js";
import messageRoutes from "./message/message.routes.js";
import channelInvitationRoutes from "./channelInvitation/channelInvitation.routes.js";
import messageAttachmentRoutes from "./messageAttachment/messageAttachment.routes.js";

const router = express.Router({ mergeParams: true });

// ============= Apply Auth to All Chat Routes =============
// All chat routes require authentication
router.use(protect);

// ============= Chat Routes =============

/**
 * Channel Routes
 * Base: /workspaces/:workspaceId/channels
 */
router.use("/channels", channelRoutes);

/**
 * Member Routes
 * Base: /workspaces/:workspaceId/channels/:channelId/members
 */
router.use("/channels/:channelId/members", memberRoutes);

/**
 * Message Routes
 * Base: /workspaces/:workspaceId/channels/:channelId/messages
 */
router.use("/channels/:channelId/messages", messageRoutes);

/**
 * Channel Invitation Routes
 * Base: /workspaces/:workspaceId/channels/:channelId/invitations
 */
router.use("/channels/:channelId/invitations", channelInvitationRoutes);

/**
 * Message Attachment Routes
 * Base: /workspaces/:workspaceId/channels/:channelId/attachments
 */
router.use("/channels/:channelId/attachments", messageAttachmentRoutes);

export default router;
