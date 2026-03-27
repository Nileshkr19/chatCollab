import { prisma } from "../../config/connectPostgres.js";
import apiError from "../../utils/apiError.js";
import asyncHandler from "../../utils/asyncHandler.js";

// Helper function to get membership details
const getMembership = async (workspaceId, userId) => {
  return await prisma.workspaceMember.findUnique({
    where: {
      workspace_id_user_id: {
        workspace_id: workspaceId,
        user_id: userId,
      },
    },
    include: {
      workspace: {
        select: {
          id: true,
          deleted_at: true,
        },
      },
    },
  });
};

export const isMember = asyncHandler(async (req, res, next) => {
  const { workspaceId } = req.params;
  const userId = req.user.userId;

  const membership = await getMembership(workspaceId, userId);
  if (!membership || !membership.is_active) {
    throw new apiError(403, "Access denied: Not a member of this workspace");
  }

  if (membership.workspace.deleted_at) {
    throw new apiError(404, "Workspace not found");
  }

  req.membership = membership;
  next();
});

export const isManager = asyncHandler(async (req, res, next) => {
  const { workspaceId } = req.params;
  const userId = req.user.userId;

  const membership = await getMembership(workspaceId, userId);
  if (!membership || !membership.is_active) {
    throw new apiError(403, "Access denied: Not a member of this workspace");
  }

  if (membership.workspace.deleted_at) {
    throw new apiError(404, "Workspace not found");
  }

  const allowedRoles = ["MANAGER", "OWNER"];

  if (!allowedRoles.includes(membership.role)) {
    throw new apiError(
      403,
      "Insufficient permissions. Only managers or owners can perform this action",
    );
  }

  req.membership = membership;
  next();
});

export const isOwner = asyncHandler(async (req, res, next) => {
  const { workspaceId } = req.params;
  const userId = req.user.userId;

  const membership = await getMembership(workspaceId, userId);
  if (!membership || !membership.is_active) {
    throw new apiError(403, "Access denied: Not a member of this workspace");
  }

  if (membership.workspace.deleted_at) {
    throw new apiError(404, "Workspace not found");
  }

  if (membership.role !== "OWNER") {
    throw new apiError(403, "Only workspace owner can perform this action");
  }

  req.membership = membership;
  next();
});
