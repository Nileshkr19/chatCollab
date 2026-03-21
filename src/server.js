import "dotenv/config";

import app from "./app.js";
import connectMongoDB from "./config/connectMongoDB.js";
import connectPostgres from "./config/connectPostgres.js";
import connectRedis from "./config/connectRedis.js";
import logger from "./utils/logger.js";
import mongoose from "mongoose";
import { prisma } from "./config/connectPostgres.js";
import { getRedis } from "./config/connectRedis.js";

const PORT = process.env.PORT || 3003;
let isShuttingDown = false;

process.on("unhandledRejection", (reason, promise) => {
  logger.error(`Unhandled Rejection at: ${promise} - reason: ${reason}`);
  process.exit(1);
});

process.on("uncaughtException", (error) => {
  logger.error(`Uncaught Exception: ${error.message}`);
  process.exit(1);
});

const startServer = async () => {
  try {
    await connectMongoDB();
    await connectPostgres();
    await connectRedis();
    const server = app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
    });
    const redisClient = getRedis();
    const shutdown = async (signal) => {
      if (isShuttingDown) return;
      isShuttingDown = true;

      logger.info("Received %s. Shutting down server...", signal);

      const forceExit = setTimeout(() => {
        logger.error("Forced shutdown after timeout");
        process.exit(1);
      }, 10000);

      // 1. Stop server
      server.close(() => {
        logger.info("Server closed");
      });

      try {
        // 2. Close DBs
        await mongoose.connection.close();
        logger.info("MongoDB connection closed");

        await prisma.$disconnect();
        logger.info("PostgreSQL connection closed");

        // 3. Close Redis
        if (redisClient) {
          await redisClient.disconnect();
          logger.info("Redis connection closed");
        }

        clearTimeout(forceExit);
        process.exit(0);
      } catch (err) {
        logger.error("Shutdown error:", err);
        process.exit(1);
      }
    };
    process.once("SIGINT", shutdown);
    process.once("SIGTERM", shutdown);
  } catch (error) {
    logger.error(`Error starting server: ${error.message}`);
    process.exit(1);
  }
};
startServer();
