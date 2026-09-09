import { getRedis } from "@config/connectRedis";
import logger from "./logger";

const DEFAULT_CACHE_TTL = 60 * 60; // 1 hour

export const getCache = async (key) => {
  try {
    const data = await getRedis().get(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    logger.error(`Error getting cache for key ${key}: ${error.message}`);
    return null;
  }
};

export const setCache = async (key, value, ttl = DEFAULT_CACHE_TTL) => {
  try {
    await getRedis().set(key, JSON.stringify(value), "EX", ttl);
  } catch (error) {
    logger.error(`Error setting cache for key ${key}: ${error.message}`);
  }
};

export const deleteCache = async (key) => {
  try {
    await getRedis().del(key);
  } catch (error) {
    logger.error(`Error deleting cache for key ${key}: ${error.message}`);
  }
};

export const cacheDeletePattern = async (pattern) => {
  try {
    const keys = await getRedis().keys(pattern);
    if (keys.length > 0) {
      await getRedis().del(keys);
    }
  } catch (error) {
    logger.error(
      `Error deleting cache with pattern ${pattern}: ${error.message}`,
    );
  }
};
