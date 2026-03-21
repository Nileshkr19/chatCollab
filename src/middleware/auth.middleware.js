import { verifyAccessToken } from "../utils/jwt.js";
import logger from "../utils/logger.js";
import apiError from "../utils/apiError.js";

export const protect = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new apiError("No token provided", 401);
    }

    const token = authHeader.split(" ")[1];
    const decoded = verifyAccessToken(token);

    if (!decoded) {
      throw new apiError("Invalid token", 401);
    }

    req.user = decoded;
    next();
  } catch (err) {
    logger.error("Error occurred in auth middleware", err);
    if (err instanceof apiError) {
      return res.status(err.status).json(apiResponse(false, err.message));
    }
    return res.status(500).json(apiResponse(false, "Internal server error"));
  }
};
