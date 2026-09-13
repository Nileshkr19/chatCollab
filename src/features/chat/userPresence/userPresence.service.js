import { getCache, setCache, deleteCache } from "@utils/cache.js";
import { redisKeys } from "@utils/redisKey.js";
import logger from "@utils/logger.js";
import { getRedis } from "@config/connectRedis.js";

const PRESENCE_TTL = 30;

export const setUserPresence = async (
  workspaceId,
  userId,
  status,
  currentChannelId,
) => {
  const presenceData = {
    status,
    lastActivityAt: new Date(),
    currentChannelId,
  };

  await setCache(
    redisKeys.userPresence(workspaceId, userId),
    presenceData,
    PRESENCE_TTL,
  );
  logger.info(
    `Set presence for user ${userId} in workspace ${workspaceId}: ${status}`,
  );
};

export const getUserPresence = async (workspaceId, userId) => {
  const presenceData = await getCache(
    redisKeys.userPresence(workspaceId, userId),
  );
  return (
    presenceData || {
      status: "offline",
      lastActivityAt: null,
      currentChannelId: null,
    }
  );
};

export const refreshUserPresence = async (workspaceId, userId) => {
  const existing = await getCache(redisKeys.userPresence(workspaceId, userId));

  if (existing) {
    await setCache(
      redisKeys.userPresence(workspaceId, userId),
      { ...existing, lastActivityAt: new Date() },
      PRESENCE_TTL,
    );
    logger.info(
      `Refreshed presence for user ${userId} in workspace ${workspaceId}`,
    );
  }
};

export const getWorkspacePresence = async (workspaceId) => {
  const keys = await getRedis().keys(`presence:${workspaceId}:*`);
  const presenceData = await Promise.all(
    keys.map(async (key) => {
      const data = await getCache(key);
      const userId = key.split(":")[2];
      return data ? { userId, ...data } : null;
    }),
  );

  return presenceData.filter(Boolean);
};

export const deleteUserPresence = async (workspaceId, userId) => {
  await deleteCache(redisKeys.userPresence(workspaceId, userId));
  logger.info(
    `Deleted presence for user ${userId} in workspace ${workspaceId}`,
  );
};
