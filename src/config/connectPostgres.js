import pkg from "@prisma/client";
const { PrismaClient } = pkg;
import { PrismaNeon } from "@prisma/adapter-neon";
import logger from "../utils/logger.js";

const createPrismaClient = () => {
  const adapter = new PrismaNeon({
    connectionString: process.env.DATABASE_URL,
  });

  return new PrismaClient({
    adapter,
    log: [
      { emit: "event", level: "query" },
      { emit: "event", level: "error" },
      { emit: "event", level: "warn" },
      { emit: "event", level: "info" },
    ],
  });
};

const prisma = createPrismaClient();

prisma.$on("query", (e) => {
  logger.debug(
    `Query: ${e.query} - Params: ${e.params} - Duration: ${e.duration}ms`,
  );
});

prisma.$on("error", (e) => {
  logger.error(`Prisma Error: ${e.message}`);
});

prisma.$on("warn", (e) => {
  logger.warn(`Prisma Warning: ${e.message}`);
});

prisma.$on("info", (e) => {
  logger.info(`Prisma Info: ${e.message}`);
});

const connectPostgres = async () => {
  if (!process.env.DATABASE_URL) {
    logger.error("DATABASE_URL is not defined in environment variables");
    throw new Error("DATABASE_URL is not defined in environment variables");
  }
  try {
    await prisma.$connect();
    logger.info("Connected to PostgreSQL database successfully");
    return prisma;
  } catch (err) {
    logger.error(`Failed to connect to PostgreSQL database: ${err.message}`);
    throw err;
  }
};

export { prisma };
export default connectPostgres;
