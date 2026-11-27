import express from "express";

import {
  getAllPermissionsController,
  getPermissionController,
  updatePermissionController,
  resetPermissionsController,
} from "./permission.controller.js";

import {
  permissionRoleSchema,
  permissionWorkspaceParamsSchema,
  updatePermissionSchema,
} from "./permission.validation.js";

import validate from "@middleware/validate.middleware.js";

import { isOwner } from "@features/workspace/workspace.middleware.js";

const router = express.Router({ mergeParams: true });

// GET all role permissions
router.get(
  "/",
  validate({ params: permissionWorkspaceParamsSchema }),
  isOwner,
  getAllPermissionsController,
);

// GET permissions for a specific role
router.get(
  "/:role",
  validate({
    params: permissionWorkspaceParamsSchema.extend(permissionRoleSchema),
  }),
  isOwner,
  getPermissionController,
);

// UPDATE permissions
router.patch(
  "/:role",
  validate({
    params: permissionWorkspaceParamsSchema.extend(permissionRoleSchema),
    body: updatePermissionSchema,
  }),
  isOwner,
  updatePermissionController,
);

// RESET permissions
router.put(
  "/:role/reset",
  validate({
    params: permissionWorkspaceParamsSchema.extend(permissionRoleSchema),
  }),
  isOwner,
  resetPermissionsController,
);

export default router;
