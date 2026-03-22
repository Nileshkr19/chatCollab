import dns from "dns";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pkg from "pg";
import logger from "../utils/logger.js";

dns.setDefaultResultOrder("ipv4first");

const { Pool } = pkg;

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  logger.error("DATABASE_URL is not defined in environment variables");
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false,
  },
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({
  adapter,
});

prisma.$on("error", (err) => {
  logger.error(`Prisma error: ${err.message}`);
});

prisma.$on("warn", (warn) => {
  logger.warn(`Prisma warning: ${warn.message}`);
});

const connectPostgres = async () => {
  try {
    await prisma.$connect();
    // Test the actual connection with a real query
    await prisma.$queryRaw`SELECT 1`;
    logger.info("Connected to PostgreSQL database successfully");
  } catch (err) {
    logger.error("Error connecting to PostgreSQL database", err);
    process.exit(1);
  }
};

export { prisma };
export default connectPostgres;
