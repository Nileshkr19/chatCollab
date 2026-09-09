import ChatPermission from "./permission/permission.models.js";
import { deleteCache } from "@utils/cache.js";
import { redisKeys } from "@utils/redisKey.js";
import logger from "@utils/logger.js";

const DEFAULT_PERMISSIONS = {
  ADMIN: {
    canSendMessages: true,
    canEditMessages: true,
    canEditAllMessages: true,
    canDeleteMessages: true,
    canDeleteAllMessages: true,
    canDeleteAttachments: true,
    canDeleteAllAttachments: true,
    canCreateChannels: true,
    canEditChannels: true,
    canDeleteChannels: true,
    canArchiveChannels: true,
    canInviteMembers: true,
    canRemoveMembers: true,
    canManageRoles: true,
    canMuteUsers: true,
    canBanUsers: true,
    canPinMessages: true,
    canAddReactions: true,
    canRemoveReactions: true,
    canRemoveAllReactions: true,
    canCreateThreads: true,
    canReplyInThreads: true,
  },
  MANAGER: {
    canSendMessages: true,
    canEditMessages: true,
    canEditAllMessages: false,
    canDeleteMessages: true,
    canDeleteAllMessages: false,
    canDeleteAttachments: true,
    canDeleteAllAttachments: false,
    canCreateChannels: true,
    canEditChannels: true,
    canDeleteChannels: false,
    canArchiveChannels: true,
    canInviteMembers: true,
    canRemoveMembers: true,
    canManageRoles: false,
    canMuteUsers: true,
    canBanUsers: false,
    canPinMessages: true,
    canAddReactions: true,
    canRemoveReactions: true,
    canRemoveAllReactions: false,
    canCreateThreads: true,
    canReplyInThreads: true,
  },
  MEMBER: {
    canSendMessages: true,
    canEditMessages: true,
    canEditAllMessages: false,
    canDeleteMessages: true,
    canDeleteAllMessages: false,
    canDeleteAttachments: true,
    canDeleteAllAttachments: false,
    canCreateChannels: false,
    canEditChannels: false,
    canDeleteChannels: false,
    canArchiveChannels: false,
    canInviteMembers: false,
    canRemoveMembers: false,
    canManageRoles: false,
    canMuteUsers: false,
    canBanUsers: false,
    canPinMessages: false,
    canAddReactions: true,
    canRemoveReactions: true,
    canRemoveAllReactions: false,
    canCreateThreads: true,
    canReplyInThreads: true,
  },
};

export const seedWorkspacePermissionsService = async (workspaceId) => {
  try {
    const chatPermissions = Object.entries(DEFAULT_PERMISSIONS).map(
      ([role, permission]) => ({
        workspaceId,
        role,
        message: `Default permissions for ${role} role in workspace ${workspaceId}`,
        permissions: permission,
      }),
    );
    await ChatPermission.insertMany(chatPermissions);
    logger.info(`Default permissions seeded for workspace ${workspaceId}`);
  } catch (error) {
    logger.error(
      `Error seeding permissions for workspace ${workspaceId}: ${error.message}`,
    );
    const err = new Error(
      `Failed to seed permissions for workspace ${workspaceId}`,
    );
    err.status = 500;
    throw err;
  }
};

export const getPermissionService = async (workspaceId, role) => {
  try {
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
    logger.error(
      `Error fetching permissions for workspace ${workspaceId} and role ${role}: ${error.message}`,
    );
    const err = new Error(
      `Failed to fetch permissions for workspace ${workspaceId} and role ${role}`,
    );
    err.status = 500;
    throw err;
  }
};

export const getAllPermissionsService = async (workspaceId) => {
  try {
    const permissions = await ChatPermission.find({ workspaceId }).lean();
    if (!permissions || permissions.length === 0) {
      logger.warn(`No permissions found for workspace ${workspaceId}`);
      const err = new Error(
        `No permissions found for workspace ${workspaceId}`,
      );
      err.status = 404;
      throw err;
    }
    return permissions;
  } catch (error) {
    logger.error(
      `Error fetching permissions for workspace ${workspaceId}: ${error.message}`,
    );
    const err = new Error(
      `Failed to fetch permissions for workspace ${workspaceId}`,
    );
    err.status = 500;
    throw err;
  }
};

export const updatePermissionService = async (
  workspaceId,
  role,
  updatedPermissions,
) => {
  try {
    const updateData = {};
    Object.keys(updatedPermissions).forEach((key) => {
      updateData[`permissions.${key}`] = updatedPermissions[key];
    });

    const updated = await ChatPermission.findOneAndUpdate(
      { workspaceId, role },
      { $set: updateData },
      { new: true },
    ).lean();

    if (!updated) {
      logger.warn(
        `No permissions found to update for workspace ${workspaceId} and role ${role}`,
      );
      const err = new Error(
        `No permissions found for workspace ${workspaceId} and role ${role}`,
      );
      err.status = 404;
      throw err;
    }

    // Invalidate cache
    await deleteCache(redisKeys.chatPermissions(workspaceId, role));
    logger.info(
      `Permissions updated and cache invalidated for workspace ${workspaceId} and role ${role}`,
    );

    return updated;
  } catch (error) {
    logger.error(
      `Error updating permissions for workspace ${workspaceId} and role ${role}: ${error.message}`,
    );
    const err = new Error(
      `Failed to update permissions for workspace ${workspaceId} and role ${role}`,
    );
    err.status = 500;
    throw err;
  }
};

export const resetPermissionsService = async (workspaceId, role) => {
  try {
    const defaultPerms = DEFAULT_PERMISSIONS[role];

    if (!defaultPerms) {
      logger.warn(`No default permissions defined for role ${role}`);
      const err = new Error(`No default permissions for role ${role}`);
      err.status = 400;
      throw err;
    }

    const updated = await ChatPermission.findOneAndUpdate(
      { workspaceId, role },
      { $set: { permissions: defaultPerms } },
      { new: true },    
    ).lean();

    if (!updated) {
      logger.warn(
        `No permissions found to reset for workspace ${workspaceId} and role ${role}`,
      );
      const err = new Error(
        `No permissions found for workspace ${workspaceId} and role ${role}`,
      );
      err.status = 404;
      throw err;
    }

    // Invalidate cache
    await deleteCache(redisKeys.chatPermissions(workspaceId, role));
    logger.info(
      `Permissions reset and cache invalidated for workspace ${workspaceId} and role ${role}`,
    );

    return updated;
  } catch (error) {
    logger.error(
      `Error resetting permissions for workspace ${workspaceId} and role ${role}: ${error.message}`,
    );
    const err = new Error(
      `Failed to reset permissions for workspace ${workspaceId} and role ${role}`,
    );
    err.status = 500;
    throw err;
  }
};
