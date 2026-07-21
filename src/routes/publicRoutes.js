import { Router } from "express";
import { publicRegisterMember, verifyMemberPublic } from "../controllers/memberController.js";
import { listPublicZones } from "../controllers/zoneController.js";
import { listPublicCoordinators } from "../controllers/coordinatorController.js";
import { uploadImage } from "../middlewares/upload.js";
import validate from "../middlewares/validate.js";
import { publicRegisterSchema } from "../validators/memberValidators.js";
import { authLimiter } from "../middlewares/rateLimiter.js";

const router = Router();

router.get("/zones", listPublicZones);
router.get("/coordinators", listPublicCoordinators);

router.post(
  "/members/register",
  authLimiter,
  uploadImage.single("photo"),
  validate(publicRegisterSchema),
  publicRegisterMember
);

router.get("/members/verify/:membershipId", verifyMemberPublic);

export default router;
