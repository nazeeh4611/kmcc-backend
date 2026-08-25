import { Router } from "express";
import {
  listPublicEvents,
  listEventsAdmin,
  createEvent,
  updateEvent,
  deleteEvent,
} from "../controllers/eventController.js";
import { authenticateAdmin, requireAdminRole } from "../middlewares/auth.js";
import { uploadImage } from "../middlewares/upload.js";
import validate from "../middlewares/validate.js";
import { eventSchema, eventUpdateSchema } from "../validators/contentValidators.js";

const router = Router();

router.get("/", listPublicEvents); // public

router.use(authenticateAdmin, requireAdminRole());
router.get("/admin/all", listEventsAdmin);
router.post("/", uploadImage.single("image"), validate(eventSchema), createEvent);
router.patch("/:id", uploadImage.single("image"), validate(eventUpdateSchema), updateEvent);
router.delete("/:id", deleteEvent);

export default router;
