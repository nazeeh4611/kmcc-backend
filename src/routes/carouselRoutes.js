import { Router } from "express";
import {
  listPublicCarousel,
  listCarouselAdmin,
  createCarouselSlide,
  updateCarouselSlide,
  deleteCarouselSlide,
} from "../controllers/carouselController.js";
import { authenticate, requireAdmin } from "../middlewares/auth.js";
import { uploadImage } from "../middlewares/upload.js";
import validate from "../middlewares/validate.js";
import { carouselSchema, carouselUpdateSchema } from "../validators/contentValidators.js";

const router = Router();

router.get("/", listPublicCarousel); // public

router.use(authenticate, requireAdmin());
router.get("/admin/all", listCarouselAdmin);
router.post("/", uploadImage.single("image"), validate(carouselSchema), createCarouselSlide);
router.patch("/:id", uploadImage.single("image"), validate(carouselUpdateSchema), updateCarouselSlide);
router.delete("/:id", deleteCarouselSlide);

export default router;
