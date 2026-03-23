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
  resendVerificationEmail,
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
  registerLimiter,
  loginLimiter,
  forgotPasswordLimiter,
  resendVerificationLimiter,
} from "../../middleware/rateLimitter.middleware.js";

const router = Router();

router.post("/register", registerLimiter, validate(registerSchema), register);
router.post("/login", loginLimiter, validate(loginSchema), login);
router.post("/refresh-token", validate(refreshTokenSchema), refreshToken);
router.post("/logout", logout);
router.post(
  "/forgot-password",
  forgotPasswordLimiter,
  validate(forgotPasswordSchema),
  forgotPassword,
);
router.post(
  "/resend-forgot-password-email",
  forgotPasswordLimiter,
  resendForgotPasswordEmail,
);
router.post("/reset-password", validate(resetPasswordSchema), resetPassword);
router.post("/verify-email", verifyEmail);
router.post(
  "/resend-verification-email",
  resendVerificationLimiter,
  resendVerificationEmail,
);

router.use(protect);
router.post("/logout-all", logoutAll);
router.get("/me", getMe);

export default router;
