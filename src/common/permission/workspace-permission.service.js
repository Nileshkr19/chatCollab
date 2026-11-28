import WorkspacePermission from "./workspace-permission.models.js";
import { deleteCache } from "@utils/cache.js";
import { redisKeys } from "@utils/redisKey.js";
import logger from "@utils/logger.js";
import apiError from "@utils/apiError.js";

import {
  WORKSPACE_ROLES,
  WORKSPACE_PERMISSION_GROUPS,
  DEFAULT_WORKSPACE_PERMISSIONS,
} from "./permission.constants.js";

// ==========================================
// HELPER FUNCTIONS
// ==========================================

const validateWorkspaceId = (workspaceId) => {
  if (!workspaceId || typeof workspaceId !== "string") {
    throw new apiError(400, "Valid workspace ID is required");
  }
};

const validateRole = (role) => {
  if (!WORKSPACE_ROLES.includes(role)) {
    throw new apiError(400, `Invalid workspace role: ${role}`);
  }
};

// ==========================================
// VALIDATE DEFAULT PERMISSIONS
// ==========================================

const validateDefaultPermissions = () => {
  const defaultRoles = Object.keys(DEFAULT_WORKSPACE_PERMISSIONS);

  if (
    defaultRoles.length !== WORKSPACE_ROLES.length ||
    WORKSPACE_ROLES.some(
      (role) => !Object.hasOwn(DEFAULT_WORKSPACE_PERMISSIONS, role),
    )
  ) {
    throw new Error(
      "DEFAULT_WORKSPACE_PERMISSIONS contains missing or invalid roles",
    );
  }

  for (const role of WORKSPACE_ROLES) {
    const rolePermissions = DEFAULT_WORKSPACE_PERMISSIONS[role];

    if (
      !rolePermissions ||
      typeof rolePermissions !== "object" ||
      Array.isArray(rolePermissions)
    ) {
      throw new Error(`Invalid default permissions for role: ${role}`);
    }

    const groups = Object.keys(rolePermissions);
    const expectedGroups = Object.keys(WORKSPACE_PERMISSION_GROUPS);

    if (
      groups.length !== expectedGroups.length ||
      expectedGroups.some((group) => !Object.hasOwn(rolePermissions, group))
    ) {
      throw new Error(`Invalid permission groups for role: ${role}`);
    }

    for (const [group, permissionKeys] of Object.entries(
      WORKSPACE_PERMISSION_GROUPS,
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

validateDefaultPermissions();

// ==========================================
// INVALIDATE WORKSPACE PERMISSION CACHE
// ==========================================

const invalidateWorkspacePermissionCache = async (workspaceId, role) => {
  const deleted = await deleteCache(
    redisKeys.workspacePermissions(workspaceId, role),
  );

  if (!deleted) {
    logger.warn(
      `Failed to invalidate workspace permission cache for workspace ${workspaceId} and role ${role}`,
    );

    return false;
  }

  logger.info(
    `Workspace permission cache invalidated for workspace ${workspaceId} and role ${role}`,
  );

  return true;
};

// ==========================================
// SEED WORKSPACE PERMISSIONS
// ==========================================

export const seedWorkspacePermissionsService = async (workspaceId) => {
  try {
    validateWorkspaceId(workspaceId);

    const workspacePermissions = WORKSPACE_ROLES.map((role) => ({
      workspaceId,
      role,
      description: `Default workspace permissions for ${role} role in workspace ${workspaceId}`,
      permissions: DEFAULT_WORKSPACE_PERMISSIONS[role],
    }));

    await WorkspacePermission.bulkWrite(
      workspacePermissions.map((permission) => ({
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

    logger.info(
      `Default workspace permissions seeded for workspace ${workspaceId}`,
    );
  } catch (error) {
    if (error.status || error.statusCode) {
      throw error;
    }

    logger.error(
      `Error seeding workspace permissions for ${workspaceId}: ${error.message}`,
    );

    throw new apiError(
      500,
      `Failed to seed workspace permissions for ${workspaceId}`,
    );
  }
};

// ==========================================
// GET PERMISSION FOR A WORKSPACE ROLE
// ==========================================

export const getWorkspacePermissionService = async (workspaceId, role) => {
  try {
    validateWorkspaceId(workspaceId);
    validateRole(role);

    const permission = await WorkspacePermission.findOne({
      workspaceId,
      role,
    }).lean();

    if (!permission) {
      logger.warn(
        `No workspace permissions found for workspace ${workspaceId} and role ${role}`,
      );

      return null;
    }

    return permission;
  } catch (error) {
    if (error.status || error.statusCode) {
      throw error;
    }

    logger.error(`Error fetching workspace permissions: ${error.message}`);

    throw new apiError(500, "Failed to fetch workspace permissions");
  }
};

// ==========================================
// GET ALL WORKSPACE PERMISSIONS
// ==========================================

export const getAllWorkspacePermissionsService = async (workspaceId) => {
  try {
    validateWorkspaceId(workspaceId);

    const permissions = await WorkspacePermission.find({
      workspaceId,
    }).lean();

    if (permissions.length === 0) {
      throw new apiError(
        404,
        `No workspace permissions found for workspace ${workspaceId}`,
      );
    }

    return permissions;
  } catch (error) {
    if (error.status || error.statusCode) {
      throw error;
    }

    logger.error(`Failed to fetch workspace permissions: ${error.message}`);

    throw new apiError(
      500,
      `Failed to fetch workspace permissions for ${workspaceId}`,
    );
  }
};

// ==========================================
// UPDATE WORKSPACE ROLE PERMISSIONS
// ==========================================

export const updateWorkspacePermissionService = async (
  workspaceId,
  role,
  updatedPermissions,
) => {
  try {
    validateWorkspaceId(workspaceId);
    validateRole(role);

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

    for (const [group, permissions] of permissionGroups) {
      if (!Object.hasOwn(WORKSPACE_PERMISSION_GROUPS, group)) {
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

      for (const [key, value] of entries) {
        if (!WORKSPACE_PERMISSION_GROUPS[group].includes(key)) {
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

    const updated = await WorkspacePermission.findOneAndUpdate(
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
        `No workspace permissions found for ${workspaceId} and role ${role}`,
      );
    }

    const cacheInvalidated = await invalidateWorkspacePermissionCache(
      workspaceId,
      role,
    );

    if (!cacheInvalidated) {
      logger.warn(
        `Workspace permission update succeeded, but cache invalidation failed for ${workspaceId} and role ${role}`,
      );
    }

    logger.info(
      `Workspace permissions updated for workspace ${workspaceId} and role ${role}`,
    );

    return updated;
  } catch (error) {
    if (error.status || error.statusCode) {
      throw error;
    }

    logger.error(`Error updating workspace permissions: ${error.message}`);

    throw new apiError(
      500,
      `Failed to update workspace permissions for ${workspaceId} and role ${role}`,
    );
  }
};

// ==========================================
// RESET WORKSPACE ROLE PERMISSIONS
// ==========================================

export const resetWorkspacePermissionsService = async (workspaceId, role) => {
  try {
    validateWorkspaceId(workspaceId);
    validateRole(role);

    const defaultPermissions = DEFAULT_WORKSPACE_PERMISSIONS[role];

    const updated = await WorkspacePermission.findOneAndUpdate(
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
        `No workspace permissions found for ${workspaceId} and role ${role}`,
      );
    }

    const cacheInvalidated = await invalidateWorkspacePermissionCache(
      workspaceId,
      role,
    );

    if (!cacheInvalidated) {
      logger.warn(
        `Workspace permission reset succeeded, but cache invalidation failed for ${workspaceId} and role ${role}`,
      );
    }

    logger.info(
      `Workspace permissions reset for workspace ${workspaceId} and role ${role}`,
    );

    return updated;
  } catch (error) {
    if (error.status || error.statusCode) {
      throw error;
    }

    logger.error(`Error resetting workspace permissions: ${error.message}`);

    throw new apiError(
      500,
      `Failed to reset workspace permissions for ${workspaceId} and role ${role}`,
    );
  }
};
