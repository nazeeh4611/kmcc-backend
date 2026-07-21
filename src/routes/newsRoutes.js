import { Router } from "express";
import {
  listPublicNews,
  getPublicNewsBySlug,
  listNewsAdmin,
  createNews,
  updateNews,
  deleteNews,
} from "../controllers/newsController.js";
import { authenticate, requireAdmin } from "../middlewares/auth.js";
import { uploadImage } from "../middlewares/upload.js";
import validate from "../middlewares/validate.js";
import { newsSchema, newsUpdateSchema } from "../validators/contentValidators.js";
import { paginationQuerySchema } from "../validators/memberValidators.js";

const router = Router();

router.get("/", validate(paginationQuerySchema.partial(), "query"), listPublicNews); // public
router.get("/:slug", getPublicNewsBySlug); // public

router.use(authenticate, requireAdmin());
router.get("/admin/all", listNewsAdmin);
router.post("/", uploadImage.single("image"), validate(newsSchema), createNews);
router.patch("/:id", uploadImage.single("image"), validate(newsUpdateSchema), updateNews);
router.delete("/:id", deleteNews);

export default router;
