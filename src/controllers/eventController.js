import Event from "../models/Event.js";
import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import { uploadBufferToCloudinary, deleteFromCloudinary } from "../config/cloudinary.js";

export const listPublicEvents = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  else filter.status = { $ne: "cancelled" };

  const events = await Event.find(filter).sort({ date: 1 });
  return res.status(200).json(new ApiResponse(200, { events }, "Events fetched"));
});

export const listEventsAdmin = asyncHandler(async (req, res) => {
  const events = await Event.find({}).sort({ date: -1 });
  return res.status(200).json(new ApiResponse(200, { events }, "Events fetched"));
});

export const createEvent = asyncHandler(async (req, res) => {
  let image = {};
  if (req.file) {
    const result = await uploadBufferToCloudinary(req.file.buffer, { folder: "kmcc_panchayath/events" });
    image = { url: result.secure_url, publicId: result.public_id };
  }

  const event = await Event.create({ ...req.body, image, createdBy: req.user.id });
  return res.status(201).json(new ApiResponse(201, { event }, "Event created"));
});

export const updateEvent = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.id);
  if (!event) throw new ApiError(404, "Event not found.");

  if (req.file) {
    if (event.image?.publicId) await deleteFromCloudinary(event.image.publicId).catch(() => null);
    const result = await uploadBufferToCloudinary(req.file.buffer, { folder: "kmcc_panchayath/events" });
    req.body.image = { url: result.secure_url, publicId: result.public_id };
  }

  Object.assign(event, req.body);
  await event.save();

  return res.status(200).json(new ApiResponse(200, { event }, "Event updated"));
});

export const deleteEvent = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.id);
  if (!event) throw new ApiError(404, "Event not found.");

  if (event.image?.publicId) await deleteFromCloudinary(event.image.publicId).catch(() => null);
  await event.deleteOne();

  return res.status(200).json(new ApiResponse(200, null, "Event deleted"));
});
