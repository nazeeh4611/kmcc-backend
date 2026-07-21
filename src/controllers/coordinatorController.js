import Coordinator from "../models/Coordinator.js";
import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";

/** GET /api/public/coordinators — powers the "Coordinator" dropdown */
export const listPublicCoordinators = asyncHandler(async (req, res) => {
  const filter = { isActive: true };
  if (req.query.zone) filter.zone = req.query.zone;

  const coordinators = await Coordinator.find(filter).sort({ name: 1 }).select("name zone");
  return res.status(200).json(new ApiResponse(200, { coordinators }, "Coordinators fetched"));
});

export const listCoordinators = asyncHandler(async (req, res) => {
  const coordinators = await Coordinator.find({}).populate("zone", "name").sort({ name: 1 });
  return res.status(200).json(new ApiResponse(200, { coordinators }, "Coordinators fetched"));
});

export const createCoordinator = asyncHandler(async (req, res) => {
  const coordinator = await Coordinator.create(req.body);
  return res.status(201).json(new ApiResponse(201, { coordinator }, "Coordinator created"));
});

export const updateCoordinator = asyncHandler(async (req, res) => {
  const coordinator = await Coordinator.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  if (!coordinator) throw new ApiError(404, "Coordinator not found.");
  return res.status(200).json(new ApiResponse(200, { coordinator }, "Coordinator updated"));
});

export const deleteCoordinator = asyncHandler(async (req, res) => {
  const coordinator = await Coordinator.findByIdAndDelete(req.params.id);
  if (!coordinator) throw new ApiError(404, "Coordinator not found.");
  return res.status(200).json(new ApiResponse(200, null, "Coordinator deleted"));
});
