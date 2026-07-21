import { Router } from "express";
import {
  listPublicPosters,
  listPostersAdmin,
  createPoster,
  updatePoster,
  deletePoster,
} from "../controllers/posterController.js";
import { authenticate, requireAdmin } from "../middlewares/auth.js";
import { uploadImage } from "../middlewares/upload.js";
import validate from "../middlewares/validate.js";
import { posterSchema, posterUpdateSchema } from "../validators/contentValidators.js";

const router = Router();

router.get("/", listPublicPosters); // public

router.use(authenticate, requireAdmin());
router.get("/admin/all", listPostersAdmin);
router.post("/", uploadImage.single("image"), validate(posterSchema), createPoster);
router.patch("/:id", uploadImage.single("image"), validate(posterUpdateSchema), updatePoster);
router.delete("/:id", deletePoster);

export default router;
