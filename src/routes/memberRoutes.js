import { Router } from "express";
import {
  listMembers,
  getPendingMembers,
  getMemberById,
  approveMember,
  rejectMember,
  createMember,
  updateMember,
  deleteMember,
  bulkDeleteMembers,
  suspendMember,
  reactivateMember,
  renewMembership,
  transferMembership,
  resetMemberPassword,
  generateMemberCard,
  exportMembers,
  getMemberStats,
  getMyMembershipDetails,
  downloadMyMembershipCard,
} from "../controllers/memberController.js";
import { authenticate, requireAdmin } from "../middlewares/auth.js";
import validate from "../middlewares/validate.js";
import { uploadImage } from "../middlewares/upload.js";
import {
  approveMemberSchema,
  adminCreateMemberSchema,
  adminUpdateMemberSchema,
  renewMembershipSchema,
  suspendMemberSchema,
  transferMembershipSchema,
  resetMemberPasswordSchema,
  paginationQuerySchema,
} from "../validators/memberValidators.js";

const router = Router();

router.get("/me", authenticate, getMyMembershipDetails);
router.get("/me/card", authenticate, downloadMyMembershipCard);

router.use(authenticate, requireAdmin());

router.get("/stats", getMemberStats);
router.get("/pending", validate(paginationQuerySchema, "query"), getPendingMembers);
router.get("/export", exportMembers);
router.get("/", validate(paginationQuerySchema, "query"), listMembers);
router.get("/:id", getMemberById);

router.post("/", uploadImage.single("photo"), validate(adminCreateMemberSchema), createMember);
router.patch("/:id", uploadImage.single("photo"), validate(adminUpdateMemberSchema), updateMember);

router.post("/:id/approve", validate(approveMemberSchema), approveMember);
router.post("/:id/reject", rejectMember);

router.post("/:id/suspend", requireAdmin("super_admin", "admin"), validate(suspendMemberSchema), suspendMember);
router.post("/:id/reactivate", requireAdmin("super_admin", "admin"), reactivateMember);
router.post("/:id/renew", validate(renewMembershipSchema), renewMembership);
router.post("/:id/transfer", requireAdmin("super_admin", "admin"), validate(transferMembershipSchema), transferMembership);
router.post("/:id/reset-password", validate(resetMemberPasswordSchema), resetMemberPassword);
router.get("/:id/card", generateMemberCard);

router.delete("/:id", requireAdmin("super_admin", "admin"), deleteMember);
router.post("/bulk-delete", requireAdmin("super_admin", "admin"), bulkDeleteMembers);

export default router;