import Redis from "ioredis";
import logger from "../utils/logger.js";

let redis = null;

const connectRedis = async () => {
  if (redis) {
    return redis;
  }
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    logger.error("REDIS_URL is not defined in environment variables");
    throw new Error("REDIS_URL is not defined in environment variables");
  }
  redis = new Redis(redisUrl, {
    retryStrategy(times) {
      if (times > 5) {
        logger.error("Failed to connect to Redis after multiple attempts");
        return null; // Stop retrying after 5 attempts
      }
      return Math.min(times * 50, 2000); // Exponential backoff
    },
  });
  redis.on("connect", () => {
    logger.info("Connected to Redis successfully");
  });
  redis.on("error", (err) => {
    logger.error(`Failed to connect to Redis: ${err.message}`);
  });

  // Test the connection with PING command
  try {
    await redis.ping();
    logger.info("Redis connection verified");
  } catch (err) {
    logger.error(`Failed to verify Redis connection: ${err.message}`);
    throw err;
  }

  return redis;
};

export const getRedis = () => {
  if (!redis) {
    throw new Error(
      "Redis client is not initialized. Call connectRedis() first.",
    );
  }
  return redis;
};

export default connectRedis;
