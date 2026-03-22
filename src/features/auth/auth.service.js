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

export const registerService = async ({
  firstName,
  lastName,
  username,
  email,
  password,
}) => {
  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });
  if (existingUser) {
    const error = new Error("User already exists with this email");
    error.status = 400;
    throw error;
  }

  const existingUsername = await prisma.user.findUnique({
    where: { username },
  });
  if (existingUsername) {
    const error = new Error("Username is already taken");
    error.status = 400;
    throw error;
  }

  const hashedPassword = await hashPassword(password);

  const user = await prisma.user.create({
    data: {
      firstName,
      lastName,
      username,
      email,
      password: hashedPassword,
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      username: true,
      email: true,
      avatar_url: true,
      status: true,
      is_verified: true,
      created_at: true,
    },
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

  logger.info(`New user registered: ${user.email} (ID: ${user.id})`);

  return {
    user,
    accessToken,
    refreshToken,
  };
};

export const loginService = async ({ email, password }) => {
  const user = await prisma.user.findUnique({
    where: { email },
  });
  if (!user) {
    const error = new Error("Invalid email or password");
    error.status = 401;
    throw error;
  }

  if (user.status === "banned") {
    const error = new Error(
      "Your account has been banned. Please contact support for more information.",
    );
    error.status = 403;
    throw error;
  }

  if (user.deleted_at) {
    const error = new Error(
      "This account has been deactivated. Please contact support for more information.",
    );
    error.status = 403;
    throw error;
  }

  const isPasswordValid = await verifyPassword(password, user.password);
  if (!isPasswordValid) {
    const error = new Error("Invalid email or password");
    error.status = 401;
    throw error;
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
    const error = new Error("Refresh token is required");
    error.status = 400;
    throw error;
  }
  const decoded = verifyRefreshToken(inComingRefreshToken);
  if (!decoded) {
    const error = new Error("Invalid refresh token");
    error.status = 401;
    throw error;
  }
  const { userId, tokenId } = decoded;
  const storedToken = await getRefreshToken(userId, tokenId);
  if (!storedToken || storedToken !== inComingRefreshToken) {
    const error = new Error("Invalid refresh token");
    error.status = 401;
    throw error;
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

  if (!user || user.status === "banned" || user.deleted_at) {
    const error = new Error("User account is not active");
    error.status = 403;
    throw error;
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
    const error = new Error("Refresh token is required");
    error.status = 400;
    throw error;
  }

  const decoded = verifyRefreshToken(inComingRefreshToken);
  if (!decoded) {
    const error = new Error("Invalid refresh token");
    error.status = 401;
    throw error;
    return;
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
    const error = new Error("User not found");
    error.status = 404;
    throw error;
  }

  return user;
};

export const forgetPasswordService = async (email) => {
  const user = await prisma.user.findUnique({
    where : {email},
    select: {
      id: true,
      email: true,
      username: true,
    }
  })
  if (!user || user.status === "banned" || user.deleted_at) {
    const error = new Error("User account is not active");
    error.status = 403;
    throw error;
  }
  const resetToken = generateAccessToken({
    userId: user.id,
    email: user.email,
    username: user.username,
  });

  const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

  
}
