import express from "express";

import {
  getAllWorkspacePermissionsController,
  getWorkspacePermissionController,
  updateWorkspacePermissionController,
  resetWorkspacePermissionsController,
} from "./workspace-permission.controller.js";

import {
  workspacePermissionParamsSchema,
  workspacePermissionRoleParamsSchema,
  updateWorkspacePermissionSchema,
} from "./workspace-permission.validation.js";

import validate from "@middleware/validate.middleware.js";
import { isOwner } from "@features/workspace/workspace.middleware.js";

const router = express.Router({ mergeParams: true });

// GET all workspace role permissions
router.get(
  "/",
  validate({ params: workspacePermissionParamsSchema }),
  isOwner,
  getAllWorkspacePermissionsController,
);

// GET permissions for a specific workspace role
router.get(
  "/:role",
  validate({ params: workspacePermissionRoleParamsSchema }),
  isOwner,
  getWorkspacePermissionController,
);

// UPDATE workspace role permissions
router.patch(
  "/:role",
  validate({
    params: workspacePermissionRoleParamsSchema,
    body: updateWorkspacePermissionSchema,
  }),
  isOwner,
  updateWorkspacePermissionController,
);

// RESET workspace role permissions
router.put(
  "/:role/reset",
  validate({ params: workspacePermissionRoleParamsSchema }),
  isOwner,
  resetWorkspacePermissionsController,
);

export default router;
