import ApiError from "../utils/ApiError.js";

/**
 * Validates req.body (default) against a Zod schema.
 * Usage: router.post('/', validate(loginSchema), controller)
 */
const validate = (schema, source = "body") => (req, res, next) => {
  console.log("Incoming body:", req[source]);

  const result = schema.safeParse(req[source]);

  if (!result.success) {
    console.log(result.error.format());
    console.log(result.error.issues);

    const errors = result.error.issues.map((issue) => ({
      field: issue.path.join("."),
      message: issue.message,
    }));

    return next(new ApiError(422, "Validation failed", errors));
  }

  req[source] = result.data;
  next();
};

export default validate;
