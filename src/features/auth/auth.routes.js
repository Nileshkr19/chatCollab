import { Router } from "express";
import {
  register,
  login,
  refreshToken,
  logout,
  logoutAll,
  getMe,
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendForgotPasswordEmail,
} from "./auth.controller.js";
import { protect } from "../../middleware/auth.middleware.js";
import validate from "../../middleware/validate.middleware.js";
import {
  registerSchema,
  loginSchema,
  resetPasswordSchema,
  forgotPasswordSchema,
  refreshTokenSchema,
} from "./auth.validation.js";

import {
  getRegisterLimiter,
  getLoginLimiter,
  getForgotPasswordLimiter,
} from "../../middleware/rateLimitter.middleware.js";

const router = Router();

// Middleware wrappers that get the limiters at request time
const registerLimiterMiddleware = (req, res, next) =>
  getRegisterLimiter()(req, res, next);
const loginLimiterMiddleware = (req, res, next) =>
  getLoginLimiter()(req, res, next);
const forgotPasswordLimiterMiddleware = (req, res, next) =>
  getForgotPasswordLimiter()(req, res, next);

router.post(
  "/register",
  registerLimiterMiddleware,
  validate(registerSchema),
  register,
);
router.post("/login", loginLimiterMiddleware, validate(loginSchema), login);
router.post("/refresh-token", validate(refreshTokenSchema), refreshToken);
router.post("/logout", logout);
router.post(
  "/forgot-password",
  forgotPasswordLimiterMiddleware,
  validate(forgotPasswordSchema),
  forgotPassword,
);
router.post(
  "/resend-forgot-password-email",
  forgotPasswordLimiterMiddleware,
  resendForgotPasswordEmail,
);
router.post("/reset-password", validate(resetPasswordSchema), resetPassword);
router.post("/verify-email", verifyEmail);

router.use(protect);
router.post("/logout-all", logoutAll);
router.get("/me", getMe);

export default router;
