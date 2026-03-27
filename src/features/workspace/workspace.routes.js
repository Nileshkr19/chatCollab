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

import { isMember, isManager, isOwner } from "./workspace.middleware.js";
import {
  createWorkspaceSchema,
  updateWorkspaceSchema,
  inviteMemberSchema,
  updateMemberRoleSchema,
  transferOwnershipSchema,
} from "./workspace.validation.js";
import validate from "../../middleware/validate.middleware.js";
import { getWorkspaceRateLimiter } from "../../middleware/rateLimitter.middleware.js";

const router = Router();

// Apply workspace rate limiter to all workspace routes
router.use(getWorkspaceRateLimiter());

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
  isManager,
  validate(inviteMemberSchema),
  inviteMember,
);
router.patch(
  "/:workspaceId/members/:userId",
  isManager,
  validate(updateMemberRoleSchema),
  updateMemberRole,
);
router.delete("/:workspaceId/members/:userId", isManager, removeMember);

router.post("/:workspaceId/leave", isMember, leaveWorkspace);
router.post(
  "/:workspaceId/transfer-ownership",
  isOwner,
  validate(transferOwnershipSchema),
  transferOwnership,
);

export default router;
