// src/routes/committeeRoutes.js

import { Router } from "express";
import {
  listCommittee,
  listCommitteeAdmin,
  createCommitteeMember,
  updateCommitteeMember,
  deleteCommitteeMember,
  reorderCommittee,
} from "../controllers/committeeController.js";

import { uploadImage } from "../middlewares/upload.js";
import { authenticate, requireAdmin } from "../middlewares/auth.js";

const router = Router();

// Public
router.get("/", listCommittee);

// Admin
router.get("/admin", authenticate, requireAdmin(), listCommitteeAdmin);

router.post(
  "/",
  authenticate,
  requireAdmin(),
  uploadImage.single("photo"),
  createCommitteeMember
);

router.put(
  "/:id",
  authenticate,
  requireAdmin(),
  uploadImage.single("photo"),
  updateCommitteeMember
);

router.delete(
  "/:id",
  authenticate,
  requireAdmin(),
  deleteCommitteeMember
);

router.put(
  "/reorder",
  authenticate,
  requireAdmin(),
  reorderCommittee
);

export default router;