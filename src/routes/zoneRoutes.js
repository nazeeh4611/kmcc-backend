import { Router } from "express";
import { listZones, createZone, updateZone, deleteZone } from "../controllers/zoneController.js";
import { authenticateAdmin, requireAdminRole } from "../middlewares/auth.js";
import validate from "../middlewares/validate.js";
import { zoneSchema } from "../validators/memberValidators.js";

const router = Router();

router.use(authenticateAdmin, requireAdminRole());

router.get("/", listZones);
router.post("/", validate(zoneSchema), createZone);
router.patch("/:id", validate(zoneSchema.partial()), updateZone);
router.delete("/:id", requireAdminRole("super_admin", "admin"), deleteZone);

export default router;
