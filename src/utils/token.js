import jwt from "jsonwebtoken";

// Admin and member tokens are signed with completely separate secrets so a
// token issued for one account type can never verify against the other's
// endpoints, even if the payload/type claim were somehow forged.
const ACCESS_SECRETS = {
  admin: () => process.env.ADMIN_JWT_ACCESS_SECRET,
  member: () => process.env.MEMBER_JWT_ACCESS_SECRET,
};

const REFRESH_SECRETS = {
  admin: () => process.env.ADMIN_JWT_REFRESH_SECRET,
  member: () => process.env.MEMBER_JWT_REFRESH_SECRET,
};

const requireSecret = (map, type) => {
  const secret = map[type]?.();
  if (!secret) {
    throw new Error(`Missing JWT secret for type "${type}"`);
  }
  return secret;
};

export const generateAccessToken = (payload) => {
  return jwt.sign(payload, requireSecret(ACCESS_SECRETS, payload.type), {
    expiresIn: process.env.JWT_ACCESS_EXPIRY || "15m",
  });
};

export const generateRefreshToken = (payload) => {
  return jwt.sign(payload, requireSecret(REFRESH_SECRETS, payload.type), {
    expiresIn: process.env.JWT_REFRESH_EXPIRY || "30d",
  });
};

export const verifyAccessToken = (token, type) => {
  return jwt.verify(token, requireSecret(ACCESS_SECRETS, type));
};

export const verifyRefreshToken = (token, type) => {
  return jwt.verify(token, requireSecret(REFRESH_SECRETS, type));
};

export const cookieOptions = (maxAge) => {
  const isProduction = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    maxAge,
    path: "/",
  };
};

export const ACCESS_TOKEN_MAX_AGE = 15 * 60 * 1000;
export const REFRESH_TOKEN_MAX_AGE = 30 * 24 * 60 * 60 * 1000;
