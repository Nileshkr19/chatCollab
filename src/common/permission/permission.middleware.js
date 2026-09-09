import asyncHandler from "@utils/asyncHandler.js";
import ChatPermission from "./permission.models.js";
import { getCache, setCache } from "@utils/cache.js";
import { redisKeys } from "@utils/redisKey.js";
import logger from "@utils/logger.js";

/**
 * Centralized permission checker with ownership support
 * @param {string} permissionKey - Permission to check (e.g., 'canDeleteMessages')
 * @param {object} options - Optional configuration
 * @param {string} options.ownershipKey - Check ownership if not owner (e.g., 'canDeleteAllMessages')
 * @param {function} options.getOwnerId - Function to extract owner ID from req (can be async)
 */
export const checkPermission = (permissionKey, options = {}) => {
  return asyncHandler(async (req, res, next) => {
    const workspaceId = req.params.workspaceId || req.body.workspaceId;
    const role = req.channelMembership?.role || req.membership?.role;
    const userId = req.user?.userId;

    if (!role) {
      return res.status(403).json({ message: "Access denied: No role found" });
    }

    // OWNER bypass all checks
    if (req.membership?.role === "OWNER" ) {
      return next();
    }

    const cacheKey = redisKeys.chatPermissions(workspaceId, role);
    let permissions = await getCache(cacheKey);

    if (!permissions) {
      const chatPermission = await ChatPermission.findOne({ workspaceId, role })
        .select("permissions")
        .lean();

      if (!chatPermission) {
        logger.warn(
          `No permissions found for workspace ${workspaceId} and role ${role}`,
        );
        return res
          .status(403)
          .json({ message: "Access denied: No permissions found" });
      }

      permissions = chatPermission.permissions;

      await setCache(cacheKey, permissions, 60 * 60); // Cache for 1 hour
      logger.debug(
        `Permissions cached for workspace ${workspaceId} and role ${role}`,
      );
    }

    // Check base permission
    if (!permissions[permissionKey]) {
      return res
        .status(403)
        .json({ message: "Access denied: Insufficient permissions" });
    }

    // For ownership checks (e.g., canDeleteMessages vs canDeleteAllMessages)
    if (options.ownershipKey && options.getOwnerId) {
      const ownerId = await Promise.resolve(options.getOwnerId(req));
      const isOwner = userId === ownerId;

      if (!isOwner && !permissions[options.ownershipKey]) {
        return res.status(403).json({
          message: `Access denied: You can only ${permissionKey.toLowerCase()} your own items`,
        });
      }
    }

    req.permission = permissions;
    next();
  });
};
