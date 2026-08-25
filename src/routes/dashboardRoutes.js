import { Router } from "express";
import { authenticateAdmin, authenticateMember, requireAdminRole } from "../middlewares/auth.js";
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
router.get("/card", authenticateMember, downloadOwnCard);

router.get("/family", authenticateMember, listFamilyMembers);
router.post(
  "/family",
  authenticateMember,
  uploadImage.single("photo"),
  validate(familyMemberSchema),
  addFamilyMember
);
router.patch(
  "/family/:id",
  authenticateMember,
  uploadImage.single("photo"),
  validate(familyMemberUpdateSchema),
  updateFamilyMember
);
router.delete("/family/:id", authenticateMember, deleteFamilyMember);

router.post("/profile-update-request", authenticateMember, requestProfileUpdate);

// ---- Admin review queue ----
router.get("/profile-update-requests", authenticateAdmin, requireAdminRole(), listProfileUpdateRequests);
router.post(
  "/profile-update-requests/:id/review",
  authenticateAdmin,
  requireAdminRole(),
  reviewProfileUpdateRequest
);

export default router;
