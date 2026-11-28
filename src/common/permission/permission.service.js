import ChatPermission from "./permission.models.js";
import { deleteCache } from "@utils/cache.js";
import { redisKeys } from "@utils/redisKey.js";
import logger from "@utils/logger.js";
import apiError from "@utils/apiError.js";

import {
  CHAT_ROLES,
  CHANNEL_PERMISSION_GROUPS,
  DEFAULT_CHANNEL_PERMISSIONS,
} from "./permission.constants.js";

// ==========================================
// HELPER FUNCTIONS
// ==========================================

// Validate workspace ID
const validateWorkspaceId = (workspaceId) => {
  if (!workspaceId || typeof workspaceId !== "string") {
    throw new apiError(400, "Valid workspace ID is required");
  }
};

// Validate role
const validateRole = (role) => {
  if (!CHAT_ROLES.includes(role)) {
    throw new apiError(400, `Invalid chat role: ${role}`);
  }
};

// ==========================================
// VALIDATE DEFAULT PERMISSIONS
// ==========================================

const validateDefaultPermissions = () => {
  // Validate roles
  const defaultRoles = Object.keys(DEFAULT_CHANNEL_PERMISSIONS);

  if (
    defaultRoles.length !== CHAT_ROLES.length ||
    CHAT_ROLES.some((role) => !Object.hasOwn(DEFAULT_CHANNEL_PERMISSIONS, role))
  ) {
    throw new Error(
      "DEFAULT_CHANNEL_PERMISSIONS contains missing or invalid roles",
    );
  }

  // Validate each role's permission structure
  for (const role of CHAT_ROLES) {
    const rolePermissions = DEFAULT_CHANNEL_PERMISSIONS[role];

    if (
      !rolePermissions ||
      typeof rolePermissions !== "object" ||
      Array.isArray(rolePermissions)
    ) {
      throw new Error(`Invalid default permissions for role: ${role}`);
    }

    const groups = Object.keys(rolePermissions);
    const expectedGroups = Object.keys(CHANNEL_PERMISSION_GROUPS);

    // Validate permission groups
    if (
      groups.length !== expectedGroups.length ||
      expectedGroups.some((group) => !Object.hasOwn(rolePermissions, group))
    ) {
      throw new Error(`Invalid permission groups for role: ${role}`);
    }

    // Validate permission keys and values
    for (const [group, permissionKeys] of Object.entries(
      CHANNEL_PERMISSION_GROUPS,
    )) {
      const groupPermissions = rolePermissions[group];

      if (
        !groupPermissions ||
        typeof groupPermissions !== "object" ||
        Array.isArray(groupPermissions)
      ) {
        throw new Error(`Invalid permission group ${group} for role ${role}`);
      }

      const actualKeys = Object.keys(groupPermissions);

      if (
        actualKeys.length !== permissionKeys.length ||
        permissionKeys.some((key) => !Object.hasOwn(groupPermissions, key))
      ) {
        throw new Error(
          `Missing or invalid permission keys in ${group} for role ${role}`,
        );
      }

      for (const [key, value] of Object.entries(groupPermissions)) {
        if (typeof value !== "boolean") {
          throw new Error(
            `Permission ${group}.${key} must be a boolean for role ${role}`,
          );
        }
      }
    }
  }
};

// Validate configuration when this module loads
validateDefaultPermissions();

// ==========================================
// INVALIDATE PERMISSION CACHE
// ==========================================

const invalidatePermissionCache = async (workspaceId, role) => {
  const deleted = await deleteCache(
    redisKeys.chatPermissions(workspaceId, role),
  );

  if (!deleted) {
    logger.warn(
      `Failed to invalidate permission cache for workspace ${workspaceId} and role ${role}`,
    );

    return false;
  }

  logger.info(
    `Permission cache invalidated for workspace ${workspaceId} and role ${role}`,
  );

  return true;
};

// ==========================================
// SEED CHANNEL PERMISSIONS
// ==========================================

export const seedChannelPermissionsService = async (workspaceId) => {
  try {
    validateWorkspaceId(workspaceId);

    const chatPermissions = CHAT_ROLES.map((role) => ({
      workspaceId,
      role,
      description: `Default permissions for ${role} role in workspace ${workspaceId}`,
      permissions: DEFAULT_CHANNEL_PERMISSIONS[role],
    }));

    // Create missing documents without overwriting customized permissions
    await ChatPermission.bulkWrite(
      chatPermissions.map((permission) => ({
        updateOne: {
          filter: {
            workspaceId: permission.workspaceId,
            role: permission.role,
          },
          update: {
            $setOnInsert: permission,
          },
          upsert: true,
        },
      })),
    );

    logger.info(`Default permissions seeded for workspace ${workspaceId}`);
  } catch (error) {
    if (error.status || error.statusCode) {
      throw error;
    }

    logger.error(
      `Error seeding permissions for workspace ${workspaceId}: ${error.message}`,
    );

    throw new apiError(
      500,
      `Failed to seed permissions for workspace ${workspaceId}`,
    );
  }
};

// ==========================================
// GET PERMISSION FOR A ROLE
// ==========================================

export const getPermissionService = async (workspaceId, role) => {
  try {
    validateWorkspaceId(workspaceId);
    validateRole(role);

    const permission = await ChatPermission.findOne({
      workspaceId,
      role,
    }).lean();

    if (!permission) {
      logger.warn(
        `No permissions found for workspace ${workspaceId} and role ${role}`,
      );

      return null;
    }

    return permission;
  } catch (error) {
    if (error.status || error.statusCode) {
      throw error;
    }

    logger.error(
      `Error fetching permissions for workspace ${workspaceId} and role ${role}: ${error.message}`,
    );

    throw new apiError(500, "Failed to fetch permissions");
  }
};

// ==========================================
// GET ALL CHANNEL PERMISSIONS
// ==========================================

export const getAllPermissionsService = async (workspaceId) => {
  try {
    validateWorkspaceId(workspaceId);

    const permissions = await ChatPermission.find({
      workspaceId,
    }).lean();

    if (permissions.length === 0) {
      throw new apiError(
        404,
        `No permissions found for workspace ${workspaceId}`,
      );
    }

    return permissions;
  } catch (error) {
    if (error.status || error.statusCode) {
      throw error;
    }

    logger.error(
      `Failed to fetch permissions for workspace ${workspaceId}: ${error.message}`,
    );

    throw new apiError(
      500,
      `Failed to fetch permissions for workspace ${workspaceId}`,
    );
  }
};

// ==========================================
// UPDATE ROLE PERMISSIONS
// ==========================================

export const updatePermissionService = async (
  workspaceId,
  role,
  updatedPermissions,
) => {
  try {
    validateWorkspaceId(workspaceId);
    validateRole(role);

    // Validate payload
    if (
      !updatedPermissions ||
      typeof updatedPermissions !== "object" ||
      Array.isArray(updatedPermissions)
    ) {
      throw new apiError(400, "Invalid permissions payload");
    }

    const permissionGroups = Object.entries(updatedPermissions);

    if (permissionGroups.length === 0) {
      throw new apiError(400, "At least one permission must be updated");
    }

    const updateData = {};

    // Validate permission groups
    for (const [group, permissions] of permissionGroups) {
      if (!Object.hasOwn(CHANNEL_PERMISSION_GROUPS, group)) {
        throw new apiError(400, `Invalid permission group: ${group}`);
      }

      if (
        !permissions ||
        typeof permissions !== "object" ||
        Array.isArray(permissions)
      ) {
        throw new apiError(400, `Invalid permissions in group: ${group}`);
      }

      const entries = Object.entries(permissions);

      if (entries.length === 0) {
        throw new apiError(400, `Permission group ${group} cannot be empty`);
      }

      // Validate individual permission keys and values
      for (const [key, value] of entries) {
        if (!CHANNEL_PERMISSION_GROUPS[group].includes(key)) {
          throw new apiError(400, `Invalid permission: ${group}.${key}`);
        }

        if (typeof value !== "boolean") {
          throw new apiError(
            400,
            `Permission ${group}.${key} must be a boolean`,
          );
        }

        updateData[`permissions.${group}.${key}`] = value;
      }
    }

    // Update MongoDB
    const updated = await ChatPermission.findOneAndUpdate(
      { workspaceId, role },
      { $set: updateData },
      {
        new: true,
        runValidators: true,
      },
    ).lean();

    if (!updated) {
      throw new apiError(
        404,
        `No permissions found for workspace ${workspaceId} and role ${role}`,
      );
    }

    // Invalidate Redis
    const cacheInvalidated = await invalidatePermissionCache(workspaceId, role);

    if (!cacheInvalidated) {
      logger.warn(
        `Permission update succeeded, but cache invalidation failed for workspace ${workspaceId} and role ${role}`,
      );
    }

    logger.info(
      `Permissions updated for workspace ${workspaceId} and role ${role}`,
    );

    return updated;
  } catch (error) {
    if (error.status || error.statusCode) {
      throw error;
    }

    logger.error(
      `Error updating permissions for workspace ${workspaceId} and role ${role}: ${error.message}`,
    );

    throw new apiError(
      500,
      `Failed to update permissions for workspace ${workspaceId} and role ${role}`,
    );
  }
};

// ==========================================
// RESET ROLE PERMISSIONS
// ==========================================

export const resetPermissionsService = async (workspaceId, role) => {
  try {
    validateWorkspaceId(workspaceId);
    validateRole(role);

    const defaultPermissions = DEFAULT_CHANNEL_PERMISSIONS[role];

    const updated = await ChatPermission.findOneAndUpdate(
      { workspaceId, role },
      {
        $set: {
          permissions: defaultPermissions,
        },
      },
      {
        new: true,
        runValidators: true,
      },
    ).lean();

    if (!updated) {
      throw new apiError(
        404,
        `No permissions found for workspace ${workspaceId} and role ${role}`,
      );
    }

    // Invalidate Redis
    const cacheInvalidated = await invalidatePermissionCache(workspaceId, role);

    if (!cacheInvalidated) {
      logger.warn(
        `Permission reset succeeded, but cache invalidation failed for workspace ${workspaceId} and role ${role}`,
      );
    }

    logger.info(
      `Permissions reset for workspace ${workspaceId} and role ${role}`,
    );

    return updated;
  } catch (error) {
    if (error.status || error.statusCode) {
      throw error;
    }

    logger.error(
      `Error resetting permissions for workspace ${workspaceId} and role ${role}: ${error.message}`,
    );

    throw new apiError(
      500,
      `Failed to reset permissions for workspace ${workspaceId} and role ${role}`,
    );
  }
};
