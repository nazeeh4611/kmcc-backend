import { Router } from "express";
import {
  getPublicSettings,
  getSettingsAdmin,
  updateSettings,
  updateLogo,
  updateFavicon,
} from "../controllers/settingsController.js";
import { authenticate, requireAdmin } from "../middlewares/auth.js";
import { uploadImage } from "../middlewares/upload.js";
import validate from "../middlewares/validate.js";
import { settingsSchema } from "../validators/contentValidators.js";

const router = Router();

router.get("/", getPublicSettings); // public

router.use(authenticate, requireAdmin("super_admin", "admin"));
router.get("/admin", getSettingsAdmin);
router.patch("/", validate(settingsSchema), updateSettings);
router.post("/logo", uploadImage.single("logo"), updateLogo);
router.post("/favicon", uploadImage.single("favicon"), updateFavicon);

export default router;
