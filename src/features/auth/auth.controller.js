import {
  registerService,
  loginService,
  refreshTokenService,
  logoutService,
  logoutAllService,
  getMeService,
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

export const registerController = asyncHandler(async (req, res) => {
  try {
    const { user, accessToken, refreshToken } = await registerService(req.body);

    res.cookie("refreshToken", refreshToken, COOKIE_OPTIONS);

    return res.status(201).json(
      apiResponse(true, "User registered successfully", {
        user,
        accessToken,
      }),
    );
  } catch (err) {
    logger.error("Error occurred while registering user", err);
    throw new apiError("Failed to register user", 500);
  }
});

export const loginController = asyncHandler(async (req, res) => {
  try {
    const { user, accessToken, refreshToken } = await loginService(req.body);

    res.cookie("refreshToken", refreshToken, COOKIE_OPTIONS);

    return res.status(200).json(
      apiResponse(true, "User logged in successfully", {
        user,
        accessToken,
      }),
    );
  } catch (err) {
    logger.error("Error occurred while logging in user", err);
    throw new apiError("Failed to log in user", 500);
  }
});

export const refreshToken = asyncHandler(async (req, res) => {
  try {
    const incomingRefreshToken = req.cookies.refreshToken;
    if (!incomingRefreshToken) {
      throw new apiError("No refresh token provided", 401);
    }

    const { accessToken, refreshToken: newRefreshToken } =
      await refreshTokenService(incomingRefreshToken);

    res.cookie("refreshToken", newRefreshToken, COOKIE_OPTIONS);

    return res.status(200).json(
      apiResponse(true, "Token refreshed successfully", {
        accessToken,
      }),
    );
  } catch (err) {
    logger.error("Error occurred while refreshing token", err);
    throw new apiError("Failed to refresh token", 500);
  }
});

export const logout = asyncHandler(async (req, res) => {
  try {
    const incomingRefreshToken = req.cookies.refreshToken;
    if (!incomingRefreshToken) {
      throw new apiError("No refresh token provided", 401);
    }

    await logoutService(incomingRefreshToken);

    res.clearCookie("refreshToken", COOKIE_OPTIONS);

    return res.status(200).json(apiResponse(true, "Logged out successfully"));
  } catch (err) {
    logger.error("Error occurred while logging out user", err);
    throw new apiError("Failed to log out user", 500);
  }
});

export const logoutAll = asyncHandler(async (req, res) => {
  try {
    await logoutAllService(req.user.id);

    res.clearCookie("refreshToken", COOKIE_OPTIONS);

    return res
      .status(200)
      .json(apiResponse(true, "Logged out from all devices successfully"));
  } catch (err) {
    logger.error("Error occurred while logging out user from all devices", err);
    throw new apiError("Failed to log out user from all devices", 500);
  }
});

export const getMe = asyncHandler(async (req, res) => {
  try {
    const user = await getMeService(req.user.id);
    return res
      .status(200)
      .json(apiResponse(true, "User details retrieved successfully", { user }));
  } catch (err) {
    logger.error("Error occurred while retrieving user details", err);
    throw new apiError("Failed to retrieve user details", 500);
  }
});
