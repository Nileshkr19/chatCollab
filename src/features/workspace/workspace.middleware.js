import apiError from "../../utils/apiError.js";
import asyncHandler from "../../utils/asyncHandler.js";
import { getWorkspaceMembership } from "./workspace-access.service.js";

/**
 * Fetches and validates the authenticated user's workspace membership.
 *
 * Requirements:
 * - Authentication middleware must run first.
 * - workspaceId must exist in req.params.
 *
 * Returns:
 * - Active workspace membership
 */
const getActiveWorkspaceMembership = async (req) => {
  const workspaceId = req.params.workspaceId;
  const userId = req.user?.userId;

  if (!workspaceId) {
    throw new apiError(400, "Workspace ID is required");
  }

  if (!userId) {
    throw new apiError(401, "Authentication required");
  }

  const membership = await getWorkspaceMembership(workspaceId, userId);

  if (!membership || !membership.is_active) {
    throw new apiError(
      403,
      "Access denied: Not an active member of this workspace",
    );
  }

  if (membership.workspace?.deleted_at) {
    throw new apiError(404, "Workspace not found");
  }

  return membership;
};

/**
 * Generic workspace role authorization middleware.
 *
 * @param {string[]} allowedRoles
 */
const authorizeWorkspaceRoles = (allowedRoles) => {
  return asyncHandler(async (req, res, next) => {
    const membership = await getActiveWorkspaceMembership(req);

    if (!allowedRoles.includes(membership.role)) {
      throw new apiError(
        403,
        "Insufficient permissions for this workspace action",
      );
    }

    req.membership = membership;

    next();
  });
};

/**
 * Allows any active workspace member.
 */
export const isMember = authorizeWorkspaceRoles(["OWNER", "MANAGER", "MEMBER"]);

/**
 * Allows workspace MANAGER and OWNER.
 */
export const isManager = authorizeWorkspaceRoles(["MANAGER", "OWNER"]);

/**
 * Allows workspace OWNER only.
 */
export const isOwner = authorizeWorkspaceRoles(["OWNER"]);
