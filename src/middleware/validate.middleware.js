import apiError from "../utils/apiError.js";

const validate = (schemaOrSchemas) => {
  return (req, res, next) => {
    const schemas =
      typeof schemaOrSchemas?.safeParse === "function"
        ? { body: schemaOrSchemas }
        : schemaOrSchemas;
    const errors = [];

    for (const [section, schema] of Object.entries(schemas || {})) {
      if (!schema) continue;

      const result = schema.safeParse(req[section] || {});
      if (!result.success) {
        errors.push(
          ...result.error.issues.map((issue) => {
            const path = issue.path.length > 0 ? `.${issue.path.join(".")}` : "";
            return `${section}${path}: ${issue.message}`;
          }),
        );
        continue;
      }

      req[section] = result.data;
    }

    if (errors.length > 0) {
      return next(new apiError(400, `Validation error: ${errors.join(", ")}`));
    }

    next();
  };
};

export default validate;
