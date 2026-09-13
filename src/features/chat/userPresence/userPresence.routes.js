import express from "express";
import {
  checkWorkspaceMembership,
  checkChannelMembership,
} from "@features/chat/chat.middleware.js";

import {
  setUserPresenceController,
  getUserPresenceController,
  refreshUserPresenceController,
  getWorkspacePresenceController,
  deleteUserPresenceController,
} from "./userPresence.controller.js";
import { validate } from "@middleware/validate.middleware.js";
import { getPresenceRefreshLimiter } from "@middleware/rateLimitter.middleware.js";
import {
  setPresenceSchema,
  workspacePresenceParamsSchema,
} from "./userPresence.validation.js";

const router = express.Router({ mergeParams: true });

const workspaceAccess = [checkWorkspaceMembership];
const channelAccess = [checkWorkspaceMembership, checkChannelMembership];
const presenceRefreshLimiterMiddleware = (req, res, next) =>
  getPresenceRefreshLimiter()(req, res, next);

router.post(
  "/channels/:channelId/presence",
  ...channelAccess,
  validate({
    params: setPresenceSchema.shape.params,
    body: setPresenceSchema.shape.body,
  }),
  setUserPresenceController,
);

router.get(
  "/presence",
  ...workspaceAccess,
  validate({ params: workspacePresenceParamsSchema }),
  getUserPresenceController,
);

router.post(
  "/presence/refresh",
  presenceRefreshLimiterMiddleware,
  ...workspaceAccess,
  validate({ params: workspacePresenceParamsSchema }),
  refreshUserPresenceController,
);

router.get(
  "/presence/workspace",
  ...workspaceAccess,
  validate({ params: workspacePresenceParamsSchema }),
  getWorkspacePresenceController,
);

router.delete(
  "/presence",
  ...workspaceAccess,
  validate({ params: workspacePresenceParamsSchema }),
  deleteUserPresenceController,
);

export default router;
