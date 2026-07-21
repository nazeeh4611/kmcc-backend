import Poster from "../models/Poster.js";
import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import { uploadBufferToCloudinary, deleteFromCloudinary } from "../config/cloudinary.js";

/** Public: only posters that are published and within their visibility window */
export const listPublicPosters = asyncHandler(async (req, res) => {
  const now = new Date();
  const posters = await Poster.find({
    status: "published",
    $and: [
      { $or: [{ publishAt: null }, { publishAt: { $lte: now } }] },
      { $or: [{ expireAt: null }, { expireAt: { $gte: now } }] },
    ],
  }).sort({ priority: -1, createdAt: -1 });

  return res.status(200).json(new ApiResponse(200, { posters }, "Posters fetched"));
});

export const listPostersAdmin = asyncHandler(async (req, res) => {
  const posters = await Poster.find({}).sort({ priority: -1, createdAt: -1 });
  return res.status(200).json(new ApiResponse(200, { posters }, "Posters fetched"));
});

export const createPoster = asyncHandler(async (req, res) => {
  if (!req.file) throw new ApiError(400, "Poster image is required.");

  const result = await uploadBufferToCloudinary(req.file.buffer, { folder: "kmcc_panchayath/posters" });

  const poster = await Poster.create({
    ...req.body,
    image: { url: result.secure_url, publicId: result.public_id },
    createdBy: req.user.id,
  });

  return res.status(201).json(new ApiResponse(201, { poster }, "Poster created"));
});

export const updatePoster = asyncHandler(async (req, res) => {
  const poster = await Poster.findById(req.params.id);
  if (!poster) throw new ApiError(404, "Poster not found.");

  if (req.file) {
    if (poster.image?.publicId) await deleteFromCloudinary(poster.image.publicId).catch(() => null);
    const result = await uploadBufferToCloudinary(req.file.buffer, { folder: "kmcc_panchayath/posters" });
    req.body.image = { url: result.secure_url, publicId: result.public_id };
  }

  Object.assign(poster, req.body);
  await poster.save();

  return res.status(200).json(new ApiResponse(200, { poster }, "Poster updated"));
});

export const deletePoster = asyncHandler(async (req, res) => {
  const poster = await Poster.findById(req.params.id);
  if (!poster) throw new ApiError(404, "Poster not found.");

  if (poster.image?.publicId) await deleteFromCloudinary(poster.image.publicId).catch(() => null);
  await poster.deleteOne();

  return res.status(200).json(new ApiResponse(200, null, "Poster deleted"));
});
