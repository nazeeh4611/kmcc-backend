import { Router } from "express";
import authRoutes from "./authRoutes.js";
import memberRoutes from "./memberRoutes.js";
import publicRoutes from "./publicRoutes.js";
import dashboardRoutes from "./dashboardRoutes.js";
import zoneRoutes from "./zoneRoutes.js";
import coordinatorRoutes from "./coordinatorRoutes.js";
import committeeRoutes from "./committeeRoutes.js";
import posterRoutes from "./posterRoutes.js";
import galleryRoutes from "./galleryRoutes.js";
import newsRoutes from "./newsRoutes.js";
import eventRoutes from "./eventRoutes.js";
import carouselRoutes from "./carouselRoutes.js";
import downloadRoutes from "./downloadRoutes.js";
import settingsRoutes from "./settingsRoutes.js";

const router = Router();

router.use("/auth", authRoutes);
router.use("/members", memberRoutes);
router.use("/dashboard", dashboardRoutes);
router.use("/zones", zoneRoutes);
router.use("/coordinators", coordinatorRoutes);
router.use("/committee", committeeRoutes);
router.use("/posters", posterRoutes);
router.use("/gallery", galleryRoutes);
router.use("/news", newsRoutes);
router.use("/events", eventRoutes);
router.use("/carousel", carouselRoutes);
router.use("/downloads", downloadRoutes);
router.use("/settings", settingsRoutes);

router.get("/health", (req, res) => {
  res.status(200).json({ success: true, message: "API is healthy", timestamp: new Date().toISOString() });
});

export default router;
