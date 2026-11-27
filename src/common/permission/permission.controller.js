import asyncHandler from "@utils/asyncHandler.js";
import apiError from "@utils/apiError.js";

import {
  getPermissionService,
  getAllPermissionsService,
  updatePermissionService,
  resetPermissionsService,
} from "./permission.service.js";

// GET /workspaces/:workspaceId/permissions
export const getAllPermissionsController = asyncHandler(async (req, res) => {
  const { workspaceId } = req.params;

  const permissions = await getAllPermissionsService(workspaceId);

  return res.status(200).json({
    success: true,
    message: "Permissions fetched successfully",
    data: permissions,
  });
});

// GET /workspaces/:workspaceId/permissions/:role
export const getPermissionController = asyncHandler(async (req, res) => {
  const { workspaceId, role } = req.params;

  const permission = await getPermissionService(workspaceId, role);

  if (!permission) {
    throw new apiError(404, `Permissions not found for role ${role}`);
  }

  return res.status(200).json({
    success: true,
    message: "Permission fetched successfully",
    data: permission,
  });
});

// PATCH /workspaces/:workspaceId/permissions/:role
export const updatePermissionController = asyncHandler(async (req, res) => {
  const { workspaceId, role } = req.params;
  const { permissions } = req.body;

  const updatedPermission = await updatePermissionService(
    workspaceId,
    role,
    permissions,
  );

  return res.status(200).json({
    success: true,
    message: `Permissions updated successfully for ${role}`,
    data: updatedPermission,
  });
});

// PUT /workspaces/:workspaceId/permissions/:role/reset
export const resetPermissionsController = asyncHandler(async (req, res) => {
  const { workspaceId, role } = req.params;

  const resetPermission = await resetPermissionsService(workspaceId, role);

  return res.status(200).json({
    success: true,
    message: `Permissions reset successfully for ${role}`,
    data: resetPermission,
  });
});
