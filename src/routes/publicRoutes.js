import { Router } from "express";
import { publicRegisterMember, verifyMemberPublic } from "../controllers/memberController.js";
import { uploadImage } from "../middlewares/upload.js";
import validate from "../middlewares/validate.js";
import { publicRegisterSchema } from "../validators/memberValidators.js";
import { authLimiter } from "../middlewares/rateLimiter.js";

const router = Router();

// Zone and Working Country are fixed lists shipped as frontend constants
// (frontend/src/lib/constants/memberOptions.ts) — no longer served from the
// DB-backed Zone/Coordinator collections, which remain for other admin use.

router.post(
  "/members/register",
  authLimiter,
  uploadImage.single("photo"),
  validate(publicRegisterSchema),
  publicRegisterMember
);

router.get("/members/verify/:membershipId", verifyMemberPublic);

export default router;
