import crypto from "crypto";
import { prisma } from "../../config/connectPostgres.js";
import { hashPassword, verifyPassword } from "../../utils/password.js";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from "../../utils/jwt.js";
import {
  storeRefreshToken,
  getRefreshToken,
  deleteRefreshToken,
  deleteAllRefreshTokens,
} from "../../utils/tokens.js";
import logger from "../../utils/logger.js";
import {
  sendForgotPasswordEmail,
  sendVerificationEmail,
} from "../../utils/sendEmail.js";

import { getRedis } from "../../config/connectRedis.js";
import apiError from "../../utils/apiError.js";

const hashResetToken = (token) => {
  return crypto.createHash("sha256").update(token).digest("hex");
};

const PASSWORD_RESET_TOKEN_TTL_MS = 15 * 60 * 1000; // 15 minutes

const VERIFICATION_TOKEN_TTL_MS = 15 * 60 * 1000; // 15 minutes

const getVerificationBaseUrl = () =>
  (
    process.env.FRONTEND_URL ||
    process.env.CLIENT_URL ||
    "http://localhost:3000"
  ).replace(/\/+$/, "") + "/verify-email";

const getResetPasswordBaseUrl = () =>
  (
    process.env.FRONTEND_URL ||
    process.env.CLIENT_URL ||
    "http://localhost:3000"
  ).replace(/\/+$/, "");

export const registerService = async ({
  firstName,
  lastName,
  username,
  email,
  password,
}) => {
  // Check if user already exists
  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [{ email }, { username }],
    },
    select: {
      email: true,
      username: true,
    },
  });

  if (existingUser) {
    const field = existingUser.email === email ? "email" : "username";
    const message =
      field === "email" ? "Email already in use" : "Username already taken";
    throw new apiError(409, message);
  }

  const hashedPassword = await hashPassword(password);

  const verificationToken = crypto.randomBytes(32).toString("hex");
  const hashedVerificationToken = hashResetToken(verificationToken);

  await getRedis().set(
    `pending:user:${hashedVerificationToken}`,
    JSON.stringify({
      firstName,
      lastName,
      username,
      email,
      password: hashedPassword,
    }),
    "EX",
    VERIFICATION_TOKEN_TTL_MS / 1000,
  );

  const verificationUrl = `${getVerificationBaseUrl()}?token=${verificationToken}&email=${encodeURIComponent(email)}`;

  try {
    await sendVerificationEmail(email, verificationUrl);
    logger.info(`Verification email sent to: ${email}`);
  } catch (emailError) {
    await getRedis().del(`pending:user:${hashedVerificationToken}`);
    logger.error(`Failed to send verification email to ${email}:`, emailError);
    throw new apiError(
      500,
      "Failed to send verification email. Please try again later.",
    );
  }

  logger.info(`User registration initiated: ${email} (Username: ${username})`);

  return {
    message: "Verification email sent. Please verify your account.",
  };
};

export const loginService = async ({ email, password }) => {
  const user = await prisma.user.findUnique({
    where: { email },
  });

  const isPasswordValid = user
    ? await verifyPassword(password, user.password)
    : false;
  if (!user || !isPasswordValid) {
    throw new apiError(401, "Invalid email or password");
  }

  if (user.status === "BANNED") {
    throw new apiError(
      403,
      "Your account has been banned. Please contact support for more information.",
    );
  }

  if (user.deleted_at) {
    throw new apiError(
      403,
      "This account has been deactivated. Please contact support for more information.",
    );
  }

  if (!user.is_verified) {
    throw new apiError(
      403,
      "Email not verified. Please check your inbox for the verification email.",
    );
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { last_seen: new Date() },
  });

  const accessToken = generateAccessToken({
    userId: user.id,
    email: user.email,
    username: user.username,
  });

  const { token: refreshToken, tokenId } = generateRefreshToken({
    userId: user.id,
  });

  await storeRefreshToken(user.id, tokenId, refreshToken);

  logger.info(`User logged in: ${user.email} (ID: ${user.id})`);

  const { password: _, ...userData } = user;

  return {
    user: userData,
    accessToken,
    refreshToken,
    tokenId,
  };
};

export const refreshTokenService = async (inComingRefreshToken) => {
  if (!inComingRefreshToken) {
    throw new apiError(400, "Refresh token is required");
  }
  const decoded = verifyRefreshToken(inComingRefreshToken);
  if (!decoded) {
    throw new apiError(401, "Invalid refresh token");
  }
  const { userId, tokenId } = decoded;
  const storedToken = await getRefreshToken(userId, tokenId);
  if (!storedToken || storedToken !== inComingRefreshToken) {
    throw new apiError(401, "Invalid refresh token");
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      username: true,
      status: true,
      deleted_at: true,
    },
  });

  if (!user || user.status === "BANNED" || user.deleted_at) {
    throw new apiError(403, "User account is not active");
  }

  await deleteRefreshToken(userId, tokenId);

  const newAccessToken = generateAccessToken({
    userId: user.id,
    email: user.email,
    username: user.username,
  });
  const { token: newRefreshToken, tokenId: newTokenId } = generateRefreshToken({
    userId: user.id,
  });

  await storeRefreshToken(user.id, newTokenId, newRefreshToken);

  return {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
    tokenId: newTokenId,
  };
};

export const logoutService = async (inComingRefreshToken) => {
  if (!inComingRefreshToken) {
    throw new apiError(400, "Refresh token is required");
  }

  const decoded = verifyRefreshToken(inComingRefreshToken);
  if (!decoded) {
    throw new apiError(401, "Invalid refresh token");
  }

  const { userId, tokenId } = decoded;
  await deleteRefreshToken(userId, tokenId);

  logger.info(`User logged out: ID ${userId}`);
};

export const logoutAllService = async (userId) => {
  await deleteAllRefreshTokens(userId);
  logger.info(`User logged out from all devices: ID ${userId}`);
};

export const getMeService = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      username: true,
      email: true,
      avatar_url: true,
      status: true,
      is_verified: true,
      provider: true,
      last_seen: true,
      created_at: true,
    },
  });

  if (!user) {
    throw new apiError(404, "User not found");
  }

  return user;
};

export const forgotPasswordService = async (email) => {
  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      status: true,
      provider: true,
      deleted_at: true,
    },
  });

  // always return same message — prevents email enumeration
  if (!user || user.status === "BANNED" || user.deleted_at) {
    return {
      message:
        "If an account with that email exists, a password reset link has been sent",
    };
  }

  if (user.provider !== "LOCAL") {
    throw new apiError(
      400,
      "Password reset is only available for local accounts",
    );
  }

  const resetToken = crypto.randomBytes(32).toString("hex");
  const hashedToken = hashResetToken(resetToken);

  // store in Redis instead of PostgreSQL
  await getRedis().set(
    `reset:${hashedToken}`,
    user.id,
    "EX",
    15 * 60, // 15 minutes
  );

  const resetUrl = `${getResetPasswordBaseUrl()}/reset-password?token=${resetToken}&email=${encodeURIComponent(user.email)}`;
  await sendForgotPasswordEmail(user.email, resetUrl);

  logger.info(`Password reset requested for: ${user.email} (ID: ${user.id})`);

  return {
    message:
      "If an account with that email exists, a password reset link has been sent",
  };
};

export const resetPasswordService = async ({ token, email, password }) => {
  const hashedToken = hashResetToken(token);

  // check Redis instead of PostgreSQL
  const userId = await getRedis().get(`reset:${hashedToken}`);
  if (!userId) {
    throw new apiError(400, "Invalid or expired reset token");
  }

  // verify user still exists and is valid
  const user = await prisma.user.findFirst({
    where: {
      id: userId,
      email,
      status: "ACTIVE",
      deleted_at: null,
      provider: "LOCAL",
    },
    select: {
      id: true,
      email: true,
    },
  });

  if (!user) {
    throw new apiError(400, "Invalid or expired reset token");
  }

  const hashedPassword = await hashPassword(password);

  await prisma.user.update({
    where: { id: user.id },
    data: { password: hashedPassword },
  });

  // delete token from Redis — one time use
  await getRedis().del(`reset:${hashedToken}`);

  // logout all devices
  await deleteAllRefreshTokens(user.id);

  logger.info(`Password reset successful for: ${user.email} (ID: ${user.id})`);

  return {
    message: "Password reset successful. Please log in with your new password.",
  };
};

export const verifyEmailService = async (token, email) => {
  const hashedToken = hashResetToken(token);

  const pendingUserData = await getRedis().get(`pending:user:${hashedToken}`);
  if (!pendingUserData) {
    throw new apiError(400, "Invalid or expired verification token");
  }

  const pendingUser = JSON.parse(pendingUserData);

  if (pendingUser.email !== email) {
    throw new apiError(
      400,
      "Invalid verification token for the provided email",
    );
  }

  const user = await prisma.user.create({
    data: {
      firstName: pendingUser.firstName,
      lastName: pendingUser.lastName,
      username: pendingUser.username,
      email: pendingUser.email,
      password: pendingUser.password,
      is_verified: true,
    },
  });

  await getRedis().del(`pending:user:${hashedToken}`);
  const accessToken = generateAccessToken({
    userId: user.id,
    email: user.email,
    username: user.username,
  });

  const { token: refreshToken, tokenId } = generateRefreshToken({
    userId: user.id,
  });
  await storeRefreshToken(user.id, tokenId, refreshToken);

  logger.info(
    `User email verified and account created: ${email} (ID: ${user.id})`,
  );
  return {
    message: "Email verified successfully. Your account has been created.",
    user,
    accessToken,
    refreshToken,
  };
};

export const resendForgotPasswordEmailService = async (email) => {
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user || user.status === "BANNED" || user.deleted_at) {
    return {
      message: "Password reset email sent if an account with that email exists",
    };
  }

  const existingToken = await getRedis().get(`reset:${user.id}`);
  if (existingToken) {
    await getRedis().del(`reset:${existingToken}`);
    await getRedis().del(`reset:${user.id}`);
  }

  const rawResetToken = crypto.randomBytes(32).toString("hex");
  const hashedResetToken = hashResetToken(rawResetToken);

  await getRedis().set(
    `reset:${hashedResetToken}`,
    user.id,
    "EX",
    PASSWORD_RESET_TOKEN_TTL_MS / 1000,
  );

  const resetUrl = `${getResetPasswordBaseUrl()}/reset-password?token=${rawResetToken}&email=${encodeURIComponent(user.email)}`;

  await sendForgotPasswordEmail(user.email, resetUrl);
  logger.info(`Resent password reset email to: ${email} (ID: ${user.id})`);

  return {
    message: "Password reset email sent if an account with that email exists",
  };
};
