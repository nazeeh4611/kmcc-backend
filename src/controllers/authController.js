import crypto from "crypto";
import Admin from "../models/Admin.js";
import Member from "../models/Member.js";
import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  cookieOptions,
  ACCESS_TOKEN_MAX_AGE,
  REFRESH_TOKEN_MAX_AGE,
} from "../utils/token.js";

const issueTokensAndSetCookies = (res, { id, role, type, tokenVersion }) => {
  const payload = { id, role, type, tokenVersion };
  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);

  res.cookie("accessToken", accessToken, cookieOptions(ACCESS_TOKEN_MAX_AGE));
  res.cookie("refreshToken", refreshToken, cookieOptions(REFRESH_TOKEN_MAX_AGE));

  return { accessToken, refreshToken };
};

export const adminLogin = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new ApiError(400, "Email and password are required.");
  }

  const admin = await Admin.findOne({ email }).select("+password");
  if (!admin || !admin.isActive) {
    throw new ApiError(401, "Invalid email or password.");
  }

  const isMatch = await admin.comparePassword(password);
  if (!isMatch) {
    throw new ApiError(401, "Invalid email or password.");
  }

  admin.lastLoginAt = new Date();
  await admin.save({ validateBeforeSave: false });

  issueTokensAndSetCookies(res, {
    id: admin._id.toString(),
    role: admin.role,
    type: "admin",
    tokenVersion: admin.refreshTokenVersion,
  });

  const response = new ApiResponse(200, { admin: admin.toSafeObject() }, "Login successful");
  
  console.log("[adminLogin] Login successful for:", email);
  console.log("[adminLogin] Cookies set:", res.getHeaders()['set-cookie']);
  
  return res.status(200).json(response);
});

export const memberLogin = asyncHandler(async (req, res) => {
  const { membershipId, password } = req.body;

  if (!membershipId || !password) {
    throw new ApiError(400, "Membership ID and password are required.");
  }

  const member = await Member.findOne({
    membershipId: membershipId.trim().toUpperCase(),
  }).select("+password");

  if (!member || !member.isActive) {
    throw new ApiError(401, "Invalid membership ID or password.");
  }

  if (member.membershipStatus === "inactive") {
    throw new ApiError(
      403,
      "Your membership has been permanently deactivated. Please contact the panchayath office."
    );
  }

  const isMatch = await member.comparePassword(password);
  if (!isMatch) {
    throw new ApiError(401, "Invalid membership ID or password.");
  }

  member.lastLoginAt = new Date();
  await member.save({ validateBeforeSave: false });

  issueTokensAndSetCookies(res, {
    id: member._id.toString(),
    role: "member",
    type: "member",
    tokenVersion: member.refreshTokenVersion,
  });

  return res.status(200).json(
    new ApiResponse(
      200,
      { member: member.toSafeObject() },
      member.isExpired
        ? "Login successful. Your membership has expired — please renew."
        : "Login successful"
    )
  );
});

export const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingToken = req.cookies?.refreshToken;

  if (!incomingToken) {
    throw new ApiError(401, "Refresh token missing. Please log in again.");
  }

  let decoded;
  try {
    decoded = verifyRefreshToken(incomingToken);
  } catch (error) {
    console.error("[refreshAccessToken] Token verification failed:", error.message);
    throw new ApiError(401, "Invalid or expired refresh token. Please log in again.");
  }

  let account;
  if (decoded.type === "admin") {
    account = await Admin.findById(decoded.id);
  } else if (decoded.type === "member") {
    account = await Member.findById(decoded.id);
  }

  if (!account || !account.isActive) {
    throw new ApiError(401, "Account not found or deactivated.");
  }

  if (account.refreshTokenVersion !== decoded.tokenVersion) {
    throw new ApiError(401, "Session has been invalidated. Please log in again.");
  }

  issueTokensAndSetCookies(res, {
    id: account._id.toString(),
    role: decoded.type === "admin" ? account.role : "member",
    type: decoded.type,
    tokenVersion: account.refreshTokenVersion,
  });

  return res.status(200).json(new ApiResponse(200, null, "Token refreshed"));
});

export const logout = asyncHandler(async (req, res) => {
  if (req.user) {
    const Model = req.user.type === "admin" ? Admin : Member;
    await Model.findByIdAndUpdate(req.user.id, { $inc: { refreshTokenVersion: 1 } });
  }

  res.clearCookie("accessToken", cookieOptions(0));
  res.clearCookie("refreshToken", cookieOptions(0));

  return res.status(200).json(new ApiResponse(200, null, "Logged out successfully"));
});

export const getCurrentUser = asyncHandler(async (req, res) => {
  if (!req.user) {
    throw new ApiError(401, "Not authenticated.");
  }
  
  const safeUser = req.user.doc.toSafeObject();
  return res.status(200).json(
    new ApiResponse(200, { user: safeUser, type: req.user.type }, "Current session")
  );
});

export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    throw new ApiError(400, "Current password and new password are required.");
  }

  if (newPassword.length < 8) {
    throw new ApiError(400, "New password must be at least 8 characters long.");
  }

  const Model = req.user.type === "admin" ? Admin : Member;
  const account = await Model.findById(req.user.id).select("+password");
  
  const isMatch = await account.comparePassword(currentPassword);
  if (!isMatch) {
    throw new ApiError(401, "Current password is incorrect.");
  }

  account.password = newPassword;
  account.refreshTokenVersion += 1;
  await account.save();

  res.clearCookie("accessToken", cookieOptions(0));
  res.clearCookie("refreshToken", cookieOptions(0));

  return res.status(200).json(
    new ApiResponse(200, null, "Password changed successfully. Please log in again.")
  );
});

export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    throw new ApiError(400, "Email is required.");
  }

  const admin = await Admin.findOne({ email });

  const genericResponse = new ApiResponse(
    200,
    null,
    "If an account with that email exists, a reset link has been sent."
  );

  if (!admin) {
    return res.status(200).json(genericResponse);
  }

  const rawToken = crypto.randomBytes(32).toString("hex");
  admin.passwordResetToken = crypto.createHash("sha256").update(rawToken).digest("hex");
  admin.passwordResetExpires = new Date(Date.now() + 30 * 60 * 1000);
  await admin.save({ validateBeforeSave: false });

  if (req.app.locals.sendPasswordResetEmail) {
    req.app.locals.sendPasswordResetEmail(admin.email, rawToken).catch((err) => {
      console.error("[forgotPassword] Failed to send email:", err.message);
    });
  } else {
    console.warn("[forgotPassword] Email service not configured. Reset token:", rawToken);
  }

  return res.status(200).json(genericResponse);
});

export const resetPassword = asyncHandler(async (req, res) => {
  const { token, newPassword, confirmPassword } = req.body;

  if (!token || !newPassword || !confirmPassword) {
    throw new ApiError(400, "Token, new password, and confirm password are required.");
  }

  if (newPassword !== confirmPassword) {
    throw new ApiError(400, "Passwords do not match.");
  }

  if (newPassword.length < 8) {
    throw new ApiError(400, "Password must be at least 8 characters long.");
  }

  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

  const admin = await Admin.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: new Date() },
  }).select("+passwordResetToken +passwordResetExpires");

  if (!admin) {
    throw new ApiError(400, "Reset token is invalid or has expired.");
  }

  admin.password = newPassword;
  admin.passwordResetToken = null;
  admin.passwordResetExpires = null;
  admin.refreshTokenVersion += 1;
  await admin.save();

  return res.status(200).json(
    new ApiResponse(200, null, "Password has been reset successfully. Please log in.")
  );
});

export const verifyEmail = asyncHandler(async (req, res) => {
  const { token } = req.params;

  if (!token) {
    throw new ApiError(400, "Verification token is required.");
  }

  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

  const member = await Member.findOne({
    emailVerificationToken: hashedToken,
    emailVerificationExpires: { $gt: new Date() },
  });

  if (!member) {
    throw new ApiError(400, "Verification token is invalid or has expired.");
  }

  member.isEmailVerified = true;
  member.emailVerificationToken = null;
  member.emailVerificationExpires = null;
  await member.save();

  return res.status(200).json(
    new ApiResponse(200, null, "Email verified successfully. You can now log in.")
  );
});

export const resendVerificationEmail = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    throw new ApiError(400, "Email is required.");
  }

  const member = await Member.findOne({ email });

  if (!member) {
    throw new ApiError(404, "Member not found.");
  }

  if (member.isEmailVerified) {
    throw new ApiError(400, "Email is already verified.");
  }

  const rawToken = crypto.randomBytes(32).toString("hex");
  member.emailVerificationToken = crypto.createHash("sha256").update(rawToken).digest("hex");
  member.emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await member.save({ validateBeforeSave: false });

  if (req.app.locals.sendVerificationEmail) {
    req.app.locals.sendVerificationEmail(member.email, rawToken).catch((err) => {
      console.error("[resendVerificationEmail] Failed to send email:", err.message);
    });
  }

  return res.status(200).json(
    new ApiResponse(200, null, "Verification email has been sent.")
  );
});