import express from "express";
import { protect } from "@features/auth/auth.middleware.js";
import channelRoutes from "./channel/channel.routes.js";
import memberRoutes from "./member/channelMember.routes.js";

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

export default router;
