import apiError from "../utils/apiError.js";

const validate = (schema) => {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const errorMessages = result.error.errors
        .map((err) => err.message)
        .join(", ");
      return next(new apiError(400, `Validation error: ${errorMessages}`));
    }
    req.body = result.data;
    next();
  };
};

export default validate;
