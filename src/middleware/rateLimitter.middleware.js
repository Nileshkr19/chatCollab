import { ipKeyGenerator, rateLimit } from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import { getRedis } from "../config/connectRedis.js";

// Cache for limiters
let limiterCache = {};

const createRateLimiter = ({ windowMs, max, message, prefix }) => {
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
      sendCommand: (...args) => {
        const redisClient = getRedis();
        return redisClient.sendCommand(args);
      },
      prefix: `rate-limit:${prefix}:`,
    }),
  });
};

// Lazy initialization wrappers that create limiters on first use
export const registerLimiter = (req, res, next) => {
  if (!limiterCache.register) {
    limiterCache.register = createRateLimiter({
      windowMs: 60 * 60 * 1000, // 1 hour
      max: 5,
      message:
        "Too many registration attempts from this IP/email, please try again after an hour",
      prefix: "register",
    });
  }
  limiterCache.register(req, res, next);
};

export const loginLimiter = (req, res, next) => {
  if (!limiterCache.login) {
    limiterCache.login = createRateLimiter({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 10,
      message:
        "Too many login attempts from this IP/email, please try again after 15 minutes",
      prefix: "login",
    });
  }
  limiterCache.login(req, res, next);
};

export const forgotPasswordLimiter = (req, res, next) => {
  if (!limiterCache.forgotPassword) {
    limiterCache.forgotPassword = createRateLimiter({
      windowMs: 60 * 60 * 1000, // 1 hour
      max: 5,
      message:
        "Too many password reset attempts from this IP/email, please try again after an hour",
      prefix: "forgot-password",
    });
  }
  limiterCache.forgotPassword(req, res, next);
};

export const resendVerificationLimiter = (req, res, next) => {
  if (!limiterCache.resendVerification) {
    limiterCache.resendVerification = createRateLimiter({
      windowMs: 60 * 60 * 1000, // 1 hour
      max: 5,
      message:
        "Too many verification email resend attempts from this IP/email, please try again after an hour",
      prefix: "resend-verification",
    });
  }
  limiterCache.resendVerification(req, res, next);
};
