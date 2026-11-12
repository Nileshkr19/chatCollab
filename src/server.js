import "dotenv/config";
import http from "http";
import app from "./app.js";
import connectMongoDB from "./config/connectMongoDB.js";
import connectPostgres from "./config/connectPostgres.js";
import connectRedis from "./config/connectRedis.js";
import logger from "./utils/logger.js";
import mongoose from "mongoose";
import { prisma } from "./config/connectPostgres.js";
import { getRedis } from "./config/connectRedis.js";
import { initializeRateLimiters } from "./middleware/rateLimitter.middleware.js";
import { initWebSocketServer } from "./realtime/websocket.server.js";

const PORT = process.env.PORT || 3000;
let isShuttingDown = false;

process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled Rejection", {
    promise: promise?.toString?.() ?? String(promise),
    reason: reason instanceof Error ? reason.message : reason,
    stack: reason instanceof Error ? reason.stack : undefined,
  });
  process.exit(1);
});

process.on("uncaughtException", (error) => {
  logger.error("Uncaught Exception", {
    message: error.message,
    stack: error.stack,
  });
  process.exit(1);
});

const httpServer = http.createServer(app);

const startServer = async () => {
  try {
    const start = performance.now();

    await Promise.all([
      connectMongoDB().then(() => {
        logger.info(`MongoDB: ${(performance.now() - start).toFixed(0)}ms`);
      }),

      connectPostgres().then(() => {
        logger.info(`PostgreSQL: ${(performance.now() - start).toFixed(0)}ms`);
      }),

      connectRedis().then(() => {
        logger.info(`Redis: ${(performance.now() - start).toFixed(0)}ms`);
      }),
    ]);

    logger.info(
      `All services connected in ${(performance.now() - start).toFixed(0)}ms`,
    );

    // Initialize rate limiters after Redis is connected
    initializeRateLimiters();
    logger.info("Rate limiters initialized with Redis store");

    // Initialize WebSocket server
    initWebSocketServer(httpServer);
    logger.info("WebSocket server initialized");

    const server = httpServer.listen(PORT, () => {
      logger.info(`Server is running on port ${PORT}`);
    });

    // time taken to start server
    logger.info(`Server started in ${process.uptime().toFixed(2)} seconds`);
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
