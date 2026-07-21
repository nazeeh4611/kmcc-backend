import { Router } from "express";
import { authenticate, requireMember, requireAdmin } from "../middlewares/auth.js";
import validate from "../middlewares/validate.js";
import { uploadImage } from "../middlewares/upload.js";
import {
  listFamilyMembers,
  addFamilyMember,
  updateFamilyMember,
  deleteFamilyMember,
} from "../controllers/familyMemberController.js";
import {
  downloadOwnCard,
  requestProfileUpdate,
  listProfileUpdateRequests,
  reviewProfileUpdateRequest,
} from "../controllers/dashboardController.js";
import { familyMemberSchema, familyMemberUpdateSchema } from "../validators/familyMemberValidators.js";

const router = Router();

// ---- Member self-service (requires member session) ----
router.get("/card", authenticate, requireMember, downloadOwnCard);

router.get("/family", authenticate, requireMember, listFamilyMembers);
router.post(
  "/family",
  authenticate,
  requireMember,
  uploadImage.single("photo"),
  validate(familyMemberSchema),
  addFamilyMember
);
router.patch(
  "/family/:id",
  authenticate,
  requireMember,
  uploadImage.single("photo"),
  validate(familyMemberUpdateSchema),
  updateFamilyMember
);
router.delete("/family/:id", authenticate, requireMember, deleteFamilyMember);

router.post("/profile-update-request", authenticate, requireMember, requestProfileUpdate);

// ---- Admin review queue ----
router.get("/profile-update-requests", authenticate, requireAdmin(), listProfileUpdateRequests);
router.post(
  "/profile-update-requests/:id/review",
  authenticate,
  requireAdmin(),
  reviewProfileUpdateRequest
);

export default router;
