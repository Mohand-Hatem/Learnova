const errorMiddleware = (err, req, res, next) => {
  console.log("ERROR:", err);

  let statusCode = err.statusCode || 500;
  let message = err.message || "Internal Server Error";

  if (err.code === 11000) {
    statusCode = 400;
    message = "Duplicate field value (already exists)";
  }

  if (err.name === "ValidationError") {
    statusCode = 400;
    message = Object.values(err.errors)
      .map((val) => val.message)
      .join(", ");
  }

  if (err.name === "JsonWebTokenError") {
    statusCode = 401;
    message = "Invalid token";
  }

  if (err.name === "TokenExpiredError") {
    statusCode = 401;
    message = "Token expired";
  }

  res.status(statusCode).json({
    success: false,
    message,
  });
};

export default errorMiddleware;
