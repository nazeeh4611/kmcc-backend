import ApiError from "../utils/ApiError.js";

// eslint-disable-next-line no-unused-vars
export const notFound = (req, res, next) => {
  const error = new ApiError(404, `Route not found: ${req.originalUrl}`);
  next(error);
};

// eslint-disable-next-line no-unused-vars
export const errorHandler = (err, req, res, next) => {
  let error = err;

  if (!(error instanceof ApiError)) {
    const statusCode = error.statusCode || (error.name === "ValidationError" ? 400 : 500);
    const message = error.message || "Internal server error";
    error = new ApiError(statusCode, message, error.errors || [], err.stack);
  }

  if (err.name === "CastError") {
    error = new ApiError(400, `Invalid value for field "${err.path}"`);
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {}).join(", ");
    error = new ApiError(409, `Duplicate value for field: ${field}`);
  }

  if (err.name === "JsonWebTokenError") {
    error = new ApiError(401, "Invalid token.");
  }

  if (err.name === "TokenExpiredError") {
    error = new ApiError(401, "Token expired.");
  }

  const response = {
    success: false,
    message: error.message,
    errors: error.errors || [],
  };

  if (process.env.NODE_ENV === "development") {
    response.stack = error.stack;
  }

  res.status(error.statusCode || 500).json(response);
};
