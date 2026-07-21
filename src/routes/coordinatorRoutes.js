import { Router } from "express";
import {
  listCoordinators,
  createCoordinator,
  updateCoordinator,
  deleteCoordinator,
} from "../controllers/coordinatorController.js";
import { authenticate, requireAdmin } from "../middlewares/auth.js";
import validate from "../middlewares/validate.js";
import { coordinatorSchema } from "../validators/memberValidators.js";

const router = Router();

router.use(authenticate, requireAdmin());

router.get("/", listCoordinators);
router.post("/", validate(coordinatorSchema), createCoordinator);
router.patch("/:id", validate(coordinatorSchema.partial()), updateCoordinator);
router.delete("/:id", requireAdmin("super_admin", "admin"), deleteCoordinator);

export default router;
