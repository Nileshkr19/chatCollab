import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import logger from "./logger.js";
import { v4 as uuidv4 } from "uuid";

const ACCESS_TOKEN_SECRET = process.env.JWT_ACCESS_TOKEN;
const REFRESH_TOKEN_SECRET = process.env.JWT_REFRESH_TOKEN;
const ACCESS_TOKEN_EXPIRATION =
  process.env.JWT_ACCESS_TOKEN_EXPIRATION || "15m";
const REFRESH_TOKEN_EXPIRATION =
  process.env.JWT_REFRESH_TOKEN_EXPIRATION || "7d";

if (!ACCESS_TOKEN_SECRET || !REFRESH_TOKEN_SECRET) {
  logger.error("JWT secrets are not defined in environment variables");
  process.exit(1);
}

export const generateAccessToken = (payload) => {
  return jwt.sign(
    {
      userId: payload.userId,
      email: payload.email,
      username: payload.username,
    },
    ACCESS_TOKEN_SECRET,
    {
      expiresIn: ACCESS_TOKEN_EXPIRATION,
    },
  );
};

export const generateRefreshToken = (payload) => {
  const tokenId = uuidv4();
  const token = jwt.sign(
    {
      userId: payload.userId,
      tokenId,
    },
    REFRESH_TOKEN_SECRET,
    {
      expiresIn: REFRESH_TOKEN_EXPIRATION,
    },
  );
};

export const verifyAccessToken = (token) => {
  try {
    return jwt.verify(token, ACCESS_TOKEN_SECRET);
  } catch (error) {
    logger.error("Invalid access token");
    throw new Error("Invalid access token");
    return null;
  }
};

export const verifyRefreshToken = (token) => {
  try {
    return jwt.verify(token, REFRESH_TOKEN_SECRET);
  } catch (error) {
    logger.error("Invalid refresh token");
    throw new Error("Invalid refresh token");
    return null;
  }
};
