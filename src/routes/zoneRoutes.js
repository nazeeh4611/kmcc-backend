import { Router } from "express";
import { listZones, createZone, updateZone, deleteZone } from "../controllers/zoneController.js";
import { authenticate, requireAdmin } from "../middlewares/auth.js";
import validate from "../middlewares/validate.js";
import { zoneSchema } from "../validators/memberValidators.js";

const router = Router();

router.use(authenticate, requireAdmin());

router.get("/", listZones);
router.post("/", validate(zoneSchema), createZone);
router.patch("/:id", validate(zoneSchema.partial()), updateZone);
router.delete("/:id", requireAdmin("super_admin", "admin"), deleteZone);

export default router;
