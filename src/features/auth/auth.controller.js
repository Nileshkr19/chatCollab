import {
  registerService,
  loginService,
  refreshTokenService,
  logoutService,
  logoutAllService,
  getMeService,
  forgotPasswordService,
  resetPasswordService,
  verifyEmailService,
  resendForgotPasswordEmailService,
  resendVerificationEmailService,
} from "./auth.service.js";

import logger from "../../utils/logger.js";
import asyncHandler from "../../utils/asyncHandler.js";
import apiResponse from "../../utils/apiResponse.js";
import apiError from "../../utils/apiError.js";

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict",
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

export const register = asyncHandler(async (req, res) => {
  try {
    const user = await registerService(req.body);

    return res
      .status(201)
      .json(new apiResponse(true, "User registered successfully", { user }));
  } catch (err) {
    logger.error("Error occurred while registering user", err);
    throw new apiError(500, "Failed to register user");
  }
});

export const login = asyncHandler(async (req, res) => {
  try {
    const { user, accessToken, refreshToken } = await loginService(req.body);

    res.cookie("refreshToken", refreshToken, COOKIE_OPTIONS);

    return res.status(200).json(
      new apiResponse(true, "User logged in successfully", {
        user,
        accessToken,
      }),
    );
  } catch (err) {
    logger.error("Error occurred while logging in user", err);
    throw new apiError(500, "Failed to log in user");
  }
});

export const refreshToken = asyncHandler(async (req, res) => {
  try {
    const incomingRefreshToken = req.cookies.refreshToken;
    if (!incomingRefreshToken) {
      throw new apiError(401, "No refresh token provided");
    }

    const { accessToken, refreshToken: newRefreshToken } =
      await refreshTokenService(incomingRefreshToken);

    res.cookie("refreshToken", newRefreshToken, COOKIE_OPTIONS);

    return res.status(200).json(
      new apiResponse(true, "Token refreshed successfully", {
        accessToken,
      }),
    );
  } catch (err) {
    logger.error("Error occurred while refreshing token", err);
    throw new apiError(500, "Failed to refresh token");
  }
});

export const logout = asyncHandler(async (req, res) => {
  try {
    const incomingRefreshToken = req.cookies.refreshToken;
    if (!incomingRefreshToken) {
      throw new apiError(401, "No refresh token provided");
    }

    await logoutService(incomingRefreshToken);

    res.clearCookie("refreshToken", COOKIE_OPTIONS);

    return res
      .status(200)
      .json(new apiResponse(true, "Logged out successfully"));
  } catch (err) {
    logger.error("Error occurred while logging out user", err);
    throw new apiError(500, "Failed to log out user");
  }
});

export const logoutAll = asyncHandler(async (req, res) => {
  try {
    await logoutAllService(req.user.userId);

    res.clearCookie("refreshToken", COOKIE_OPTIONS);

    return res
      .status(200)
      .json(new apiResponse(true, "Logged out from all devices successfully"));
  } catch (err) {
    logger.error("Error occurred while logging out user from all devices", err);
    throw new apiError(500, "Failed to log out user from all devices");
  }
});

export const getMe = asyncHandler(async (req, res) => {
  try {
    const user = await getMeService(req.user.userId);
    return res
      .status(200)
      .json(
        new apiResponse(true, "User details retrieved successfully", { user }),
      );
  } catch (err) {
    logger.error("Error occurred while retrieving user details", err);
    throw new apiError(500, "Failed to retrieve user details");
  }
});

export const forgotPassword = asyncHandler(async (req, res) => {
  try {
    const { email } = req.body;
    const result = await forgotPasswordService(email);

    return res
      .status(200)
      .json(
        new apiResponse(true, "Password reset email sent successfully", result),
      );
  } catch (err) {
    logger.error("Error occurred while sending password reset email", err);
    throw new apiError(500, "Failed to send password reset email");
  }
});

export const resetPassword = asyncHandler(async (req, res) => {
  try {
    const { token, email, password } = req.body;
    const result = await resetPasswordService(token, email, password);

    return res
      .status(200)
      .json(new apiResponse(true, "Password reset successfully", result));
  } catch (err) {
    logger.error("Error occurred while resetting password", err);
    throw new apiError(500, "Failed to reset password");
  }
});

export const verifyEmail = asyncHandler(async (req, res) => {
  try {
    const { token, email } = req.body;
    const result = await verifyEmailService(token, email);

    return res
      .status(200)
      .json(new apiResponse(true, "Email verified successfully", result));
  } catch (err) {
    logger.error("Error occurred while verifying email", err);
    throw new apiError(500, "Failed to verify email");
  }
});

export const resendForgotPasswordEmail = asyncHandler(async (req, res) => {
  try {
    const { email } = req.query;
    const result = await resendForgotPasswordEmailService(email);
    return res
      .status(200)
      .json(
        new apiResponse(
          true,
          "Password reset email resent successfully",
          result,
        ),
      );
  } catch (err) {
    logger.error("Error occurred while resending password reset email", err);
    throw new apiError(500, "Failed to resend password reset email");
  }
});

export const resendVerificationEmail = asyncHandler(async (req, res) => {
  try {
    const { token, email } = req.query;
    const result = await resendVerificationEmailService(token, email);
    return res
      .status(200)
      .json(
        new apiResponse(true, "Verification email resent successfully", result),
      );
  } catch (err) {
    logger.error("Error occurred while resending verification email", err);
    throw new apiError(500, "Failed to resend verification email");
  }
});
