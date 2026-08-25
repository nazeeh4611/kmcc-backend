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
import { authenticateAdmin, requireAdminRole } from "../middlewares/auth.js";

const router = Router();

// Public
router.get("/", listCommittee);

// Admin
router.get("/admin", authenticateAdmin, requireAdminRole(), listCommitteeAdmin);

router.post(
  "/",
  authenticateAdmin,
  requireAdminRole(),
  uploadImage.single("photo"),
  createCommitteeMember
);

router.put(
  "/:id",
  authenticateAdmin,
  requireAdminRole(),
  uploadImage.single("photo"),
  updateCommitteeMember
);

router.delete(
  "/:id",
  authenticateAdmin,
  requireAdminRole(),
  deleteCommitteeMember
);

router.put(
  "/reorder",
  authenticateAdmin,
  requireAdminRole(),
  reorderCommittee
);

export default router;