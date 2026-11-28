import asyncHandler from "@utils/asyncHandler.js";
import apiError from "@utils/apiError.js";
import WorkspacePermission from "./workspace-permission.models.js";
import { getCache, setCache } from "@utils/cache.js";
import { redisKeys } from "@utils/redisKey.js";
import logger from "@utils/logger.js";

import {
  WORKSPACE_ROLES,
  WORKSPACE_PERMISSION_GROUPS,
} from "./permission.constants.js";

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

// Validate permission path against workspace constants
const isValidWorkspacePermissionPath = (permissionPath) => {
  if (typeof permissionPath !== "string") {
    return false;
  }

  const [group, key, ...remaining] = permissionPath.split(".");

  if (remaining.length > 0 || !group || !key) {
    return false;
  }

  return (
    Object.hasOwn(WORKSPACE_PERMISSION_GROUPS, group) &&
    WORKSPACE_PERMISSION_GROUPS[group].includes(key)
  );
};

// ==========================================
// WORKSPACE PERMISSION MIDDLEWARE
// ==========================================

export const authorizeWorkspacePermission = (permissionPath) => {
  const permissionPaths = Array.isArray(permissionPath)
    ? permissionPath
    : [permissionPath];

  return asyncHandler(async (req, res, next) => {
    // 1. Validate middleware configuration
    if (
      permissionPaths.length === 0 ||
      !permissionPaths.every(isValidWorkspacePermissionPath)
    ) {
      throw new apiError(500, "Invalid workspace permission configuration");
    }

    // 2. Get workspace and user context
    const workspaceId = req.params.workspaceId || req.body.workspaceId;
    const userId = req.user?.userId;
    const membership = req.membership;

    if (!workspaceId) {
      throw new apiError(400, "Workspace ID is required");
    }

    if (!userId || !membership) {
      throw new apiError(401, "Unauthorized");
    }

    if (
      membership.workspace_id !== workspaceId ||
      membership.user_id !== userId ||
      !membership.is_active
    ) {
      throw new apiError(403, "Invalid workspace membership");
    }

    // 3. Workspace OWNER has full workspace authority
    if (membership.role === "OWNER") {
      return next();
    }

    // 4. Validate workspace role
    const role = membership.role;

    if (!WORKSPACE_ROLES.includes(role)) {
      throw new apiError(403, "Invalid workspace role");
    }

    // 5. Get permissions from Redis
    const cacheKey = redisKeys.workspacePermissions(workspaceId, role);

    let permissions = await getCache(cacheKey);

    // 6. Cache miss: fetch permissions from MongoDB
    if (permissions == null) {
      const workspacePermission = await WorkspacePermission.findOne({
        workspaceId,
        role,
      })
        .select("permissions")
        .lean();

      if (!workspacePermission?.permissions) {
        logger.warn(
          `No workspace permissions found for workspace ${workspaceId} and role ${role}`,
        );

        throw new apiError(
          403,
          "Access denied: No workspace permissions found",
        );
      }

      permissions = workspacePermission.permissions;

      await setCache(cacheKey, permissions, PERMISSION_CACHE_TTL);
    }

    // 7. Check requested permissions
    const hasPermission = permissionPaths.some(
      (path) => getNestedPermission(permissions, path) === true,
    );

    if (!hasPermission) {
      throw new apiError(
        403,
        "Access denied: Insufficient workspace permissions",
      );
    }

    // 8. Make permissions available to controllers
    req.workspacePermissions = permissions;

    next();
  });
};
