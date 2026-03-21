import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import cors from "cors";
import cookieParser from "cookie-parser";
import logger from "./utils/logger.js";
import authRoutes from "./features/auth/auth.routes.js";

const app = express();

// Middleware
app.use(helmet());
app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  }),
);
app.use(
  morgan("dev", {
    stream: { write: (message) => logger.http(message.trim()) },
  }),
);

app.use(express.json());
app.use(cookieParser());

app.use("/api/auth", authRoutes);

app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

// Global error handler
app.use((err, req, res, next) => {
  logger.error("Unhandled error occurred", err);
  res.status(500).json({ success: false, message: "Internal server error" });
});

export default app;
