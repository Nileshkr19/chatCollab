import asyncHandler from "@utils/asyncHandler.js";
import apiError from "@utils/apiError.js";

import {
  getWorkspacePermissionService,
  getAllWorkspacePermissionsService,
  updateWorkspacePermissionService,
  resetWorkspacePermissionsService,
} from "./workspace-permission.service.js";

// GET /workspaces/:workspaceId/permissions
export const getAllWorkspacePermissionsController = asyncHandler(
  async (req, res) => {
    const { workspaceId } = req.params;

    const permissions = await getAllWorkspacePermissionsService(workspaceId);

    return res.status(200).json({
      success: true,
      message: "Workspace permissions fetched successfully",
      data: permissions,
    });
  },
);

// GET /workspaces/:workspaceId/permissions/:role
export const getWorkspacePermissionController = asyncHandler(
  async (req, res) => {
    const { workspaceId, role } = req.params;

    const permission = await getWorkspacePermissionService(workspaceId, role);

    if (!permission) {
      throw new apiError(
        404,
        `Workspace permissions not found for role ${role}`,
      );
    }

    return res.status(200).json({
      success: true,
      message: "Workspace permission fetched successfully",
      data: permission,
    });
  },
);

// PATCH /workspaces/:workspaceId/permissions/:role
export const updateWorkspacePermissionController = asyncHandler(
  async (req, res) => {
    const { workspaceId, role } = req.params;
    const { permissions } = req.body;

    const updatedPermission = await updateWorkspacePermissionService(
      workspaceId,
      role,
      permissions,
    );

    return res.status(200).json({
      success: true,
      message: `Workspace permissions updated successfully for ${role}`,
      data: updatedPermission,
    });
  },
);

// PUT /workspaces/:workspaceId/permissions/:role/reset
export const resetWorkspacePermissionsController = asyncHandler(
  async (req, res) => {
    const { workspaceId, role } = req.params;

    const resetPermission = await resetWorkspacePermissionsService(
      workspaceId,
      role,
    );

    return res.status(200).json({
      success: true,
      message: `Workspace permissions reset successfully for ${role}`,
      data: resetPermission,
    });
  },
);
