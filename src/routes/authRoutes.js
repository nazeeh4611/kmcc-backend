// routes/authRoutes.js
import { Router } from "express";
import {
  adminLogin,
  memberLogin,
  refreshAdminToken,
  refreshMemberToken,
  adminLogout,
  memberLogout,
  getCurrentAdmin,
  getCurrentMember,
  changePassword,
  forgotPassword,
  resetPassword,
} from "../controllers/authController.js";
import { authenticateAdmin, authenticateMember, authenticateEither } from "../middlewares/auth.js";
import validate from "../middlewares/validate.js";
import { authLimiter } from "../middlewares/rateLimiter.js";
import {
  adminLoginSchema,
  memberLoginSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "../validators/authValidators.js";

const router = Router();

// ---- Admin auth (fully isolated: own secret, own storage, own endpoints) ----
router.post("/admin/login", authLimiter, validate(adminLoginSchema), adminLogin);
router.post("/admin/refresh", refreshAdminToken);
router.post("/admin/logout", authenticateAdmin, adminLogout);
router.get("/admin/me", authenticateAdmin, getCurrentAdmin);

// ---- Member auth (fully isolated: own secret, own storage, own endpoints) ----
router.post("/member/login", authLimiter, validate(memberLoginSchema), memberLogin);
router.post("/member/refresh", refreshMemberToken);
router.post("/member/logout", authenticateMember, memberLogout);
router.get("/member/me", authenticateMember, getCurrentMember);

// ---- Shared (both account types use these) ----
router.post("/change-password", authenticateEither, validate(changePasswordSchema), changePassword);
router.post("/forgot-password", authLimiter, validate(forgotPasswordSchema), forgotPassword);
router.post("/reset-password", authLimiter, validate(resetPasswordSchema), resetPassword);

export default router;
