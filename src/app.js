import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import logger from "./utils/logger.js";

const app = express();

// Middleware
app.use(helmet());
app.use(
  cors({
    origin: "http://localhost:3000", // Adjust as needed for your frontend
    credentials: true,
  }),
);
app.use(express.json());
app.use(cookieParser());

// Routes

app.use((req, res, next) => {
  logger.info(`${req.method} ${req.originalUrl}`);
  next();
});

export default app;
