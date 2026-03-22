import bcrypt from "bcryptjs";
import logger from "./logger.js";

const SALT_ROUNDS = 10;

export const hashPassword = async (password) => {
  try {
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    return hashedPassword;
  } catch (err) {
    logger.error(`Error hashing password: ${err.message}`);
    throw err;
  }
};

export const verifyPassword = async (password, hashedPassword) => {
  try {
    const isMatch = await bcrypt.compare(password, hashedPassword);
    return isMatch;
  } catch (err) {
    logger.error(`Error comparing password: ${err.message}`);
    throw err;
  }
};
