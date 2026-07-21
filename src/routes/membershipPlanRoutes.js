import { Router } from "express";
import {
  listMembershipPlans,
  createMembershipPlan,
  updateMembershipPlan,
  deleteMembershipPlan,
} from "../controllers/membershipPlanController.js";
import { authenticate, requireAdmin } from "../middlewares/auth.js";

const router = Router();

router.use(authenticate, requireAdmin());

router.get("/", listMembershipPlans);
router.post("/", requireAdmin("super_admin", "admin"), createMembershipPlan);
router.patch("/:id", requireAdmin("super_admin", "admin"), updateMembershipPlan);
router.delete("/:id", requireAdmin("super_admin", "admin"), deleteMembershipPlan);

export default router;
