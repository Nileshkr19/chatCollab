import { Router } from "express";
import {
  createWorkspace,
  getUserWorkspaces,
  getWorkspace,
  updateWorkspace,
  deleteWorkspace,
  getWorkspaceMembers,
  inviteMember,
  updateMemberRole,
  removeMember,
  leaveWorkspace,
  transferOwnership,
} from "./workspace.controller.js";

import { isMember, isOwner } from "./workspace.middleware.js";
import {
  createWorkspaceSchema,
  updateWorkspaceSchema,
  inviteMemberSchema,
  updateMemberRoleSchema,
  transferOwnershipSchema,
} from "./workspace.validation.js";
import validate from "../../middleware/validate.middleware.js";
import { getWorkspaceRateLimiter } from "../../middleware/rateLimitter.middleware.js";

import workspacePermissionRoutes from "@common/permission/workspace-permission.routes.js";
import { authorizeWorkspacePermission } from "@common/permission/workspace-permission.middleware.js";

const router = Router();

// Apply workspace rate limiter to all workspace routes
const workspaceRateLimiterMiddleware = (req, res, next) =>
  getWorkspaceRateLimiter()(req, res, next);

const authorizeManagerInvite = (req, res, next) => {
  if (req.body?.role !== "MANAGER") {
    return next();
  }

  return authorizeWorkspacePermission("members.manageRoles")(req, res, next);
};

router.use(workspaceRateLimiterMiddleware);
router.use("/:workspaceId/permissions", workspacePermissionRoutes);

router.post("/", validate(createWorkspaceSchema), createWorkspace);
router.get("/", getUserWorkspaces);
router.get("/:workspaceId", isMember, getWorkspace);
router.patch(
  "/:workspaceId",
  isOwner,
  validate(updateWorkspaceSchema),
  updateWorkspace,
);
router.delete("/:workspaceId", isOwner, deleteWorkspace);

router.get("/:workspaceId/members", isMember, getWorkspaceMembers);
router.post(
  "/:workspaceId/members/invite",
  isMember,
  authorizeManagerInvite,
  validate(inviteMemberSchema),
  inviteMember,
);
router.patch(
  "/:workspaceId/members/:userId",
  isMember,
  authorizeWorkspacePermission("members.manageRoles"),
  validate(updateMemberRoleSchema),
  updateMemberRole,
);
router.delete(
  "/:workspaceId/members/:userId",
  isMember,
  authorizeWorkspacePermission("members.remove"),
  removeMember,
);

router.post("/:workspaceId/leave", isMember, leaveWorkspace);
router.post(
  "/:workspaceId/transfer-ownership",
  isOwner,
  validate(transferOwnershipSchema),
  transferOwnership,
);

export default router;
