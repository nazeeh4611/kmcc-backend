import { Router } from "express";
import {
  listPublicDownloads,
  listDownloadsAdmin,
  createDownload,
  updateDownload,
  deleteDownload,
} from "../controllers/downloadController.js";
import { authenticate, requireAdmin } from "../middlewares/auth.js";
import { uploadPdf } from "../middlewares/upload.js";
import validate from "../middlewares/validate.js";
import { downloadSchema, downloadUpdateSchema } from "../validators/contentValidators.js";

const router = Router();

router.get("/", listPublicDownloads); // public

router.use(authenticate, requireAdmin());
router.get("/admin/all", listDownloadsAdmin);
router.post("/", uploadPdf.single("pdf"), validate(downloadSchema), createDownload);
router.patch("/:id", uploadPdf.single("pdf"), validate(downloadUpdateSchema), updateDownload);
router.delete("/:id", deleteDownload);

export default router;
