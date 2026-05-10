export const validate = (schema) => {
  return (req, res, next) => {
    // لو Zod schema
    if (typeof schema.safeParse === "function") {
      const result = schema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: result.error.errors[0].message,
        });
      }
      req.body = result.data;
      return next();
    }

    // لو Joi schema
    if (typeof schema.validate === "function") {
      const { error, value } = schema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          message: error.details[0].message,
        });
      }
      req.body = value;
      return next();
    }

    next();
  };
};
