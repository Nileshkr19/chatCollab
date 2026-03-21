import { getRedis } from "../config/connectRedis.js";
import logger from "./logger.js";

const REFRESH_TOKEN_EXPIRATION = 7 * 24 * 60 * 60; // 7 days in seconds

export const storeRefreshToken = async (userId, tokenId, token) => {
  try {
    const key = `refresh:${userId}:${token}`;
    await getRedis().set(
      key,
      token,
      "EX", REFRESH_TOKEN_EXPIRATION
    ) 
    logger.info(`Stored refresh token for user ${userId}`);
  } catch (err) {
    logger.error(
      `Error storing refresh token for user ${userId}: ${err.message}`,
    );
    throw err;
  }
};

export const getRefreshToken = async (userId, token) => {
  try {
    const key = `refresh:${userId}:${token}`;
    const result = await getRedis().get(key);
    logger.info(
      `Retrieved refresh token for user ${userId}: ${result ? "valid" : "invalid"}`,
    );
    return result;
  } catch (err) {
    logger.error(
      `Error retrieving refresh token for user ${userId}: ${err.message}`,
    );
    throw err;
  }
};

export const deleteRefreshToken = async (userId, token) => {
  try {
    const key = `refresh:${userId}:${token}`;
    await getRedis().del(key);
    logger.info(`Deleted refresh token for user ${userId}`);
  } catch (err) {
    logger.error(
      `Error deleting refresh token for user ${userId}: ${err.message}`,
    );
    throw err;
  }
};

export const deleteAllRefreshTokens = async (userId) => {
  try {
    const pattern = `refresh:${userId}:*`;
    const keys = await getRedis().keys(pattern);
    if (keys.length > 0) {
      await getRedis().del(...keys);
      logger.info(`Deleted all refresh tokens for user ${userId}`);
    }
  } catch (err) {
    logger.error(
      `Error deleting all refresh tokens for user ${userId}: ${err.message}`,
    );
    throw err;
  }
};
