import dotenv from "dotenv";
dotenv.config();

import app from "./app.js";
import connectMongoDB from "./config/connectMongoDB.js";
import connectPostgres from "./config/connectPostgres.js";
import logger from "./utils/logger.js";
import mongoose from "mongoose";
import { prisma } from "./config/connectPostgres.js";

const PORT = process.env.PORT || 3003;

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

    const server = app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
    });

    const shutdown = async (signal) => {
      logger.info("Received %s. Shutting down server...", signal);

      const forceExit = setTimeout(() => {
        logger.error("Forced shutdown after timeout");
        process.exit(1);
      }, 10000); // Force exit after 10 seconds

      server.close(async () => {
        clearTimeout(forceExit);
        logger.info("Server closed");
        await mongoose.connection.close();
        await prisma.$disconnect();
        logger.info("MongoDB connection closed");
        logger.info("PostgreSQL connection closed");
        process.exit(0);
      });
    };
    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
  } catch (error) {
    logger.error(`Error starting server: ${error.message}`);
    process.exit(1);
  }
};
startServer();
