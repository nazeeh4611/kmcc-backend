import { Router } from "express";
import {
  adminLogin,
  memberLogin,
  refreshAccessToken,
  logout,
  getCurrentUser,
  changePassword,
  forgotPassword,
  resetPassword,
} from "../controllers/authController.js";
import { authenticate } from "../middlewares/auth.js";
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

router.post("/admin/login", authLimiter, validate(adminLoginSchema), adminLogin);
router.post("/member/login", authLimiter, validate(memberLoginSchema), memberLogin);

router.post("/refresh", refreshAccessToken);
router.post("/logout", authenticate, logout);
router.get("/me", authenticate, getCurrentUser);
router.post("/change-password", authenticate, validate(changePasswordSchema), changePassword);

router.post("/forgot-password", authLimiter, validate(forgotPasswordSchema), forgotPassword);
router.post("/reset-password", authLimiter, validate(resetPasswordSchema), resetPassword);

export default router;
