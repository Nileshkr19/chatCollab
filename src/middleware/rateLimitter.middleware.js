import { ipKeyGenerator, rateLimit } from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import { getRedis } from "../config/connectRedis.js";

// Limiters will be initialized after Redis connection
let registerLimiter = null;
let loginLimiter = null;
let forgotPasswordLimiter = null;
let resendVerificationLimiter = null;

const createRateLimiter = ({ windowMs, max, message, prefix }) => {
  // Bypass rate limiting in development
  if (process.env.NODE_ENV === "development") {
    return (req, res, next) => next();
  }

  return rateLimit({
    windowMs,
    max,
    message: { success: false, message },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
      const ip = ipKeyGenerator(req);
      const email = req.body?.email || req.query?.email || "";
      return `${ip}:${email}`;
    },
    store: new RedisStore({
      sendCommand: (...command) => {
        const redisClient = getRedis();
        return redisClient.call(...command);
      },
      prefix: `rate-limit:${prefix}:`,
    }),
  });
};

// Initialize all limiters after Redis is connected
export const initializeRateLimiters = () => {
  registerLimiter = createRateLimiter({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5,
    message:
      "Too many registration attempts from this IP/email, please try again after an hour",
    prefix: "register",
  });

  loginLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10,
    message:
      "Too many login attempts from this IP/email, please try again after 15 minutes",
    prefix: "login",
  });

  forgotPasswordLimiter = createRateLimiter({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5,
    message:
      "Too many password reset attempts from this IP/email, please try again after an hour",
    prefix: "forgot-password",
  });
};

// Export wrapper functions
export const getRegisterLimiter = () => registerLimiter;
export const getLoginLimiter = () => loginLimiter;
export const getForgotPasswordLimiter = () => forgotPasswordLimiter;
