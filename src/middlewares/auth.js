import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import { verifyAccessToken } from "../utils/token.js";
import Admin from "../models/Admin.js";
import Member from "../models/Member.js";

const extractToken = (req) => {
  if (req.cookies?.accessToken) return req.cookies.accessToken;
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) return header.split(" ")[1];
  return null;
};

/**
 * Verifies the access token and attaches req.user = { id, role, type }.
 * Does NOT restrict by type — use requireAdmin / requireMember after this.
 */
export const authenticate = asyncHandler(async (req, res, next) => {
  const token = extractToken(req);

  if (!token) {
    throw new ApiError(401, "Authentication required. Please log in.");
  }

  let decoded;
  try {
    decoded = verifyAccessToken(token);
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      throw new ApiError(401, "Session expired. Please refresh your session.");
    }
    throw new ApiError(401, "Invalid authentication token.");
  }

  if (decoded.type === "admin") {
    const admin = await Admin.findById(decoded.id);
    if (!admin || !admin.isActive) {
      throw new ApiError(401, "Admin account not found or deactivated.");
    }
    req.user = { id: admin._id.toString(), role: admin.role, type: "admin", doc: admin };
  } else if (decoded.type === "member") {
    const member = await Member.findById(decoded.id);
    if (!member || !member.isActive) {
      throw new ApiError(401, "Member account not found or deactivated.");
    }
    req.user = { id: member._id.toString(), role: "member", type: "member", doc: member };
  } else {
    throw new ApiError(401, "Invalid token payload.");
  }

  next();
});

/** Restrict route to admin-type users, optionally by specific roles. */
export const requireAdmin = (...roles) =>
  asyncHandler(async (req, res, next) => {
    if (!req.user || req.user.type !== "admin") {
      throw new ApiError(403, "Admin access required.");
    }
    if (roles.length && !roles.includes(req.user.role)) {
      throw new ApiError(403, "You do not have permission to perform this action.");
    }
    next();
  });

/** Restrict route to member-type users. */
export const requireMember = asyncHandler(async (req, res, next) => {
  if (!req.user || req.user.type !== "member") {
    throw new ApiError(403, "Member access required.");
  }
  next();
});
