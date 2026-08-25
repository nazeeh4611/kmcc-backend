import { Router } from "express";
import {
  listCoordinators,
  createCoordinator,
  updateCoordinator,
  deleteCoordinator,
} from "../controllers/coordinatorController.js";
import { authenticateAdmin, requireAdminRole } from "../middlewares/auth.js";
import validate from "../middlewares/validate.js";
import { coordinatorSchema } from "../validators/memberValidators.js";

const router = Router();

router.use(authenticateAdmin, requireAdminRole());

router.get("/", listCoordinators);
router.post("/", validate(coordinatorSchema), createCoordinator);
router.patch("/:id", validate(coordinatorSchema.partial()), updateCoordinator);
router.delete("/:id", requireAdminRole("super_admin", "admin"), deleteCoordinator);

export default router;
