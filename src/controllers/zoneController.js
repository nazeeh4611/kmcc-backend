import Zone from "../models/Zone.js";
import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";

/** GET /api/public/zones — powers the "Panchayath/Zone" dropdown */
export const listPublicZones = asyncHandler(async (req, res) => {
  const zones = await Zone.find({ isActive: true }).sort({ priority: 1, name: 1 }).select("name nameEnglish");
  return res.status(200).json(new ApiResponse(200, { zones }, "Zones fetched"));
});

/** GET /api/zones — admin listing (includes inactive) */
export const listZones = asyncHandler(async (req, res) => {
  const zones = await Zone.find({}).sort({ priority: 1, name: 1 });
  return res.status(200).json(new ApiResponse(200, { zones }, "Zones fetched"));
});

export const createZone = asyncHandler(async (req, res) => {
  const zone = await Zone.create(req.body);
  return res.status(201).json(new ApiResponse(201, { zone }, "Zone created"));
});

export const updateZone = asyncHandler(async (req, res) => {
  const zone = await Zone.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!zone) throw new ApiError(404, "Zone not found.");
  return res.status(200).json(new ApiResponse(200, { zone }, "Zone updated"));
});

export const deleteZone = asyncHandler(async (req, res) => {
  const zone = await Zone.findByIdAndDelete(req.params.id);
  if (!zone) throw new ApiError(404, "Zone not found.");
  return res.status(200).json(new ApiResponse(200, null, "Zone deleted"));
});
