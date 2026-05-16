export const validate = (schema) => {
  return (req, res, next) => {
    const result = schema.safeParse(req.body || {});

    if (!result.success) {
      const errors = result.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      }));

      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors,
      });
    }

    req.body = result.data;

    next();
  };
};

export const parseJsonFields = (req, res, next) => {
  try {
    if (req.body.name && typeof req.body.name === "string") {
      req.body.name = JSON.parse(req.body.name);
    }

    next();
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: "Invalid JSON format",
    });
  }
};
