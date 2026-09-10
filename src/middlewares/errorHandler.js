import ApiError from "../utils/ApiError.js";

// eslint-disable-next-line no-unused-vars
export const notFound = (req, res, next) => {
  const error = new ApiError(404, `Route not found: ${req.originalUrl}`);
  next(error);
};

// Field names as they appear in the schema/DB, mapped to the label a
// non-technical member/admin actually recognizes from the form.
const FRIENDLY_FIELD_NAMES = {
  membershipId: "Membership ID",
  homeCountryNumber: "home country phone number",
  workingCountryNumber: "working country phone number",
  phone: "phone number",
  email: "email address",
};

const friendlyFieldName = (field) => FRIENDLY_FIELD_NAMES[field] || field;

// eslint-disable-next-line no-unused-vars
export const errorHandler = (err, req, res, next) => {
  let error = err;

  // Mongoose schema validation failure (e.g. Member.create()/doc.save()
  // rejecting a required/invalid field). Its default `.message` is a single
  // technical blob like `Member validation failed: bloodGroup: Path
  // \`bloodGroup\` is required.` — meaningless to a non-developer. Break it
  // into the same {field, message} shape the Zod `validate` middleware
  // produces so the frontend renders one plain-English line per problem
  // field instead of the raw Mongoose text.
  if (!(error instanceof ApiError) && err.name === "ValidationError" && err.errors) {
    const errors = Object.entries(err.errors).map(([field, validatorError]) => ({
      field,
      message: validatorError.message,
    }));
    error = new ApiError(422, "Please correct the highlighted fields and try again.", errors);
  } else if (!(error instanceof ApiError)) {
    const statusCode = error.statusCode || 500;
    const message = error.message || "Internal server error";
    error = new ApiError(statusCode, message, error.errors || [], err.stack);
  }

  if (err.name === "CastError") {
    error = new ApiError(400, `We couldn't understand the value provided for "${friendlyFieldName(err.path)}".`);
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0];
    error = new ApiError(
      409,
      field === "membershipId"
        ? "That membership number is already taken. Please try submitting again."
        : `This ${friendlyFieldName(field)} is already registered.`
    );
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
