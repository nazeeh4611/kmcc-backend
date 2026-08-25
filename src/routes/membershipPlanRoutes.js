import { Router } from "express";
import {
  listMembershipPlans,
  createMembershipPlan,
  updateMembershipPlan,
  deleteMembershipPlan,
} from "../controllers/membershipPlanController.js";
import { authenticateAdmin, requireAdminRole } from "../middlewares/auth.js";

const router = Router();

router.use(authenticateAdmin, requireAdminRole());

router.get("/", listMembershipPlans);
router.post("/", requireAdminRole("super_admin", "admin"), createMembershipPlan);
router.patch("/:id", requireAdminRole("super_admin", "admin"), updateMembershipPlan);
router.delete("/:id", requireAdminRole("super_admin", "admin"), deleteMembershipPlan);

export default router;
