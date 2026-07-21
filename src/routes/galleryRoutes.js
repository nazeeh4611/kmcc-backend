import { Router } from "express";
import {
  listPublicGalleries,
  listGalleriesAdmin,
  createGallery,
  addImagesToGallery,
  removeImageFromGallery,
  updateGallery,
  deleteGallery,
} from "../controllers/galleryController.js";
import { authenticate, requireAdmin } from "../middlewares/auth.js";
import { uploadImages } from "../middlewares/upload.js";
import validate from "../middlewares/validate.js";
import { gallerySchema, galleryUpdateSchema } from "../validators/contentValidators.js";

const router = Router();

router.get("/", listPublicGalleries); // public

router.use(authenticate, requireAdmin());
router.get("/admin/all", listGalleriesAdmin);
router.post("/", uploadImages.array("images", 20), validate(gallerySchema), createGallery);
router.post("/:id/images", uploadImages.array("images", 20), addImagesToGallery);
router.delete("/:id/images/:imageId", removeImageFromGallery);
router.patch("/:id", validate(galleryUpdateSchema), updateGallery);
router.delete("/:id", deleteGallery);

export default router;
