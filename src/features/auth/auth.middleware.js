import { verifyAccessToken } from "../../utils/jwt.js";
import logger from "../../utils/logger.js";
import apiError from "../../utils/apiError.js";
import apiResponse from "../../utils/apiResponse.js";

export const protect = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new apiError(401, "No token provided");
    }

    const token = authHeader.split(" ")[1];
    const decoded = verifyAccessToken(token);

    if (!decoded) {
      throw new apiError(401, "Invalid token");
    }

    req.user = decoded;
    next();
  } catch (err) {
    logger.error("Error occurred in auth middleware", err);
    if (err instanceof apiError) {
      return res
        .status(err.statusCode)
        .json(new apiResponse(err.statusCode, err.message));
    }
    return res
      .status(500)
      .json(new apiResponse(500, "Internal server error"));
  }
};
