/**
 * Wraps an async express route/controller so rejected promises
 * are forwarded to the centralized error-handling middleware.
 * @param {Function} requestHandler
 */
const asyncHandler = (requestHandler) => (req, res, next) => {
  Promise.resolve(requestHandler(req, res, next)).catch(next);
};

export default asyncHandler;
