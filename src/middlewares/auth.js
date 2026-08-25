// middlewares/auth.js
import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import { verifyAccessToken } from "../utils/token.js";
import Admin from "../models/Admin.js";
import Member from "../models/Member.js";

const extractToken = (req) => {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) return header.split(" ")[1];
  return null;
};

/**
 * Authenticates a request as an admin session. Verifies the access token
 * against the admin-only secret — a member token will never pass this check
 * because it was never signed with the admin secret in the first place.
 */
export const authenticateAdmin = asyncHandler(async (req, res, next) => {
  const token = extractToken(req);

  if (!token) {
    throw new ApiError(401, "Authentication required. Please log in.");
  }

  let decoded;
  try {
    decoded = verifyAccessToken(token, "admin");
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      throw new ApiError(401, "Session expired. Please refresh your session.");
    }
    throw new ApiError(401, "Invalid authentication token.");
  }

  if (decoded.type !== "admin") {
    throw new ApiError(401, "Invalid token payload.");
  }

  const admin = await Admin.findById(decoded.id);
  if (!admin || !admin.isActive) {
    throw new ApiError(401, "Admin account not found or deactivated.");
  }

  req.user = { id: admin._id.toString(), role: admin.role, type: "admin", doc: admin };
  next();
});

/**
 * Authenticates a request as a member session. Verifies the access token
 * against the member-only secret — an admin token will never pass this check.
 */
export const authenticateMember = asyncHandler(async (req, res, next) => {
  const token = extractToken(req);

  if (!token) {
    throw new ApiError(401, "Authentication required. Please log in.");
  }

  let decoded;
  try {
    decoded = verifyAccessToken(token, "member");
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      throw new ApiError(401, "Session expired. Please refresh your session.");
    }
    throw new ApiError(401, "Invalid authentication token.");
  }

  if (decoded.type !== "member") {
    throw new ApiError(401, "Invalid token payload.");
  }

  const member = await Member.findById(decoded.id);
  if (!member || !member.isActive) {
    throw new ApiError(401, "Member account not found or deactivated.");
  }

  req.user = { id: member._id.toString(), role: "member", type: "member", doc: member };
  next();
});

/**
 * Authenticates either an admin or a member session — used only by the
 * shared /auth/change-password endpoint, which both account types call.
 * Tries the admin secret first, then the member secret; each attempt is
 * fully isolated (loads only the matching model), so this never confuses
 * the two account types with each other.
 */
export const authenticateEither = asyncHandler(async (req, res, next) => {
  const token = extractToken(req);

  if (!token) {
    throw new ApiError(401, "Authentication required. Please log in.");
  }

  try {
    const decoded = verifyAccessToken(token, "admin");
    if (decoded.type === "admin") {
      const admin = await Admin.findById(decoded.id);
      if (admin?.isActive) {
        req.user = { id: admin._id.toString(), role: admin.role, type: "admin", doc: admin };
        return next();
      }
    }
  } catch {
    /* not a valid admin token — try member below */
  }

  try {
    const decoded = verifyAccessToken(token, "member");
    if (decoded.type === "member") {
      const member = await Member.findById(decoded.id);
      if (member?.isActive) {
        req.user = { id: member._id.toString(), role: "member", type: "member", doc: member };
        return next();
      }
    }
  } catch {
    /* not a valid member token either */
  }

  throw new ApiError(401, "Invalid authentication token.");
});

export const requireAdminRole = (...roles) =>
  asyncHandler(async (req, res, next) => {
    if (!req.user || req.user.type !== "admin") {
      throw new ApiError(403, "Admin access required.");
    }
    if (roles.length && !roles.includes(req.user.role)) {
      throw new ApiError(403, "You do not have permission to perform this action.");
    }
    next();
  });
