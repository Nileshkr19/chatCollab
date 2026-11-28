import asyncHandler from "@utils/asyncHandler.js";
import apiError from "@utils/apiError.js";
import ChatPermission from "./permission.models.js";
import { getCache, setCache } from "@utils/cache.js";
import { redisKeys } from "@utils/redisKey.js";
import logger from "@utils/logger.js";
import { CHAT_PERMISSION_GROUPS } from "./permission.constants.js";

// Permission cache TTL: 5 minutes
const PERMISSION_CACHE_TTL = 5 * 60;

// ==========================================
// HELPER FUNCTIONS
// ==========================================

// Get nested permission using dot notation
const getNestedPermission = (permissions, permissionPath) => {
  return permissionPath
    .split(".")
    .reduce((current, key) => current?.[key], permissions);
};

// Validate permission path against supported constants
const isValidPermissionPath = (permissionPath) => {
  if (typeof permissionPath !== "string") {
    return false;
  }

  const [group, key, ...remaining] = permissionPath.split(".");

  if (remaining.length > 0 || !group || !key) {
    return false;
  }

  return (
    Object.hasOwn(CHAT_PERMISSION_GROUPS, group) &&
    CHAT_PERMISSION_GROUPS[group].includes(key)
  );
};

// ==========================================
// CHECK PERMISSION MIDDLEWARE
// ==========================================

export const checkPermission = (permissionPath, options = {}) => {
  const permissionPaths = Array.isArray(permissionPath)
    ? permissionPath
    : [permissionPath];

  return asyncHandler(async (req, res, next) => {
    const channelRole = req.channelMembership?.role;
    const isWorkspaceOwner = req.membership?.role === "OWNER";

    const workspaceId = req.params.workspaceId || req.body.workspaceId;

    // Validate workspace and user context
    if (!workspaceId) {
      throw new apiError(400, "Workspace ID is required");
    }

    const userId = req.user?.userId;

    if (!workspaceId || !userId) {
      throw new apiError(401, "Unauthorized");
    }

    // Workspace OWNER has a separate bypass.
    if (isWorkspaceOwner) {
      return next();
    }

    // Other users must have an explicit channel role.
    if (!channelRole) {
      throw new apiError(403, "Channel membership required");
    }

    const role = channelRole;

    if (!role) {
      throw new apiError(403, "Access denied: No role or user found");
    }

    // Validate requested permission
    if (!permissionPaths.every(isValidPermissionPath)) {
      throw new apiError(500, "Invalid permission configuration");
    }

    // Validate optional ownership permission
    if (
      options.ownershipKey &&
      (!options.getOwnerId || !isValidPermissionPath(options.ownershipKey))
    ) {
      throw new apiError(500, "Invalid ownership permission configuration");
    }

    // Workspace OWNER bypasses role permissions
    if (req.membership?.role === "OWNER") {
      return next();
    }

    // Get permissions from Redis
    const cacheKey = redisKeys.chatPermissions(workspaceId, role);

    let permissions = await getCache(cacheKey);

    // Cache miss: fetch permissions from MongoDB
    if (!permissions) {
      const chatPermission = await ChatPermission.findOne({
        workspaceId,
        role,
      })
        .select("permissions")
        .lean();

      if (!chatPermission?.permissions) {
        logger.warn(
          `No permissions found for workspace ${workspaceId} and role ${role}`,
        );

        throw new apiError(403, "Access denied: No permissions found");
      }

      permissions = chatPermission.permissions;

      await setCache(cacheKey, permissions, PERMISSION_CACHE_TTL);
    }

    const hasPermission = permissionPaths.some(
      (path) => getNestedPermission(permissions, path) === true,
    );

    if (!hasPermission) {
      throw new apiError(403, "Access denied: Insufficient permissions");
    }

    // Check resource ownership when required
    if (options.ownershipKey && options.getOwnerId) {
      const ownerId = await options.getOwnerId(req);

      if (ownerId == null) {
        throw new apiError(404, "Resource not found");
      }

      const isResourceOwner =
        ownerId != null && String(userId) === String(ownerId);

      const canManageAll = getNestedPermission(
        permissions,
        options.ownershipKey,
      );

      if (!isResourceOwner && canManageAll !== true) {
        throw new apiError(
          403,
          "You can only perform this action on your own resources",
        );
      }
    }

    // Make permissions available to controllers
    req.permission = permissions;

    next();
  });
};
