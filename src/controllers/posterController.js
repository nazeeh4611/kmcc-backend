import Poster from "../models/Poster.js";
import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import { uploadBufferToCloudinary, deleteFromCloudinary } from "../config/cloudinary.js";

const FOLDER = "kmcc_panchayath/posters";
// ADJUST to match your Poster schema. Anything not listed here is ignored.
const EDITABLE = ["title", "description", "link", "status", "publishAt", "expireAt", "priority"];

const pickEditable = (body = {}) =>
  Object.fromEntries(EDITABLE.filter((key) => body[key] !== undefined).map((key) => [key, body[key]]));

// Empty string / "null" clears the date; anything unparseable is a 400.
const parseDate = (value, label) => {
  if (value === null || value === "" || value === "null") return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new ApiError(400, `${label} is not a valid date.`);
  return date;
};

// Runs BEFORE any Cloudinary call. `existing` is the current doc on update.
const validateFields = (fields, existing = null) => {
  if (fields.publishAt !== undefined) fields.publishAt = parseDate(fields.publishAt, "publishAt");
  if (fields.expireAt !== undefined) fields.expireAt = parseDate(fields.expireAt, "expireAt");

  if (fields.priority !== undefined) {
    fields.priority = Number(fields.priority);
    if (!Number.isFinite(fields.priority)) throw new ApiError(400, "Priority must be a number.");
  }

  // Compare against the merged result, so updating only one date is still checked.
  const publishAt = "publishAt" in fields ? fields.publishAt : existing?.publishAt ?? null;
  const expireAt = "expireAt" in fields ? fields.expireAt : existing?.expireAt ?? null;
  if (publishAt && expireAt && expireAt <= publishAt) {
    throw new ApiError(400, "expireAt must be after publishAt.");
  }

  return fields;
};

/** Public: only posters that are published and within their visibility window */
export const listPublicPosters = asyncHandler(async (req, res) => {
  const now = new Date();
  const posters = await Poster.find({
    status: "published",
    $and: [
      { $or: [{ publishAt: null }, { publishAt: { $lte: now } }] },
      { $or: [{ expireAt: null }, { expireAt: { $gte: now } }] },
    ],
  })
    .select("-image.publicId -createdBy")
    .sort({ priority: -1, createdAt: -1 })
    .lean();

  return res.status(200).json(new ApiResponse(200, { posters }, "Posters fetched"));
});

export const listPostersAdmin = asyncHandler(async (req, res) => {
  const posters = await Poster.find({}).sort({ priority: -1, createdAt: -1 }).lean();
  return res.status(200).json(new ApiResponse(200, { posters }, "Posters fetched"));
});

export const createPoster = asyncHandler(async (req, res) => {
  if (!req.file) throw new ApiError(400, "Poster image is required.");

  const fields = validateFields(pickEditable(req.body));

  const result = await uploadBufferToCloudinary(req.file.buffer, { folder: FOLDER });

  try {
    const poster = await Poster.create({
      ...fields,
      image: { url: result.secure_url, publicId: result.public_id },
      createdBy: req.user.id,
    });
    return res.status(201).json(new ApiResponse(201, { poster }, "Poster created"));
  } catch (error) {
    await deleteFromCloudinary(result.public_id).catch(() => null);
    throw error;
  }
});

export const updatePoster = asyncHandler(async (req, res) => {
  const poster = await Poster.findById(req.params.id);
  if (!poster) throw new ApiError(404, "Poster not found.");

  const fields = validateFields(pickEditable(req.body), poster);
  const oldPublicId = poster.image?.publicId;

  let uploaded = null;
  if (req.file) {
    uploaded = await uploadBufferToCloudinary(req.file.buffer, { folder: FOLDER });
    poster.image = { url: uploaded.secure_url, publicId: uploaded.public_id };
  }

  Object.assign(poster, fields);

  try {
    await poster.save();
  } catch (error) {
    if (uploaded) await deleteFromCloudinary(uploaded.public_id).catch(() => null);
    throw error;
  }

  // Remove the old image only after the new state is persisted.
  if (uploaded && oldPublicId) await deleteFromCloudinary(oldPublicId).catch(() => null);

  return res.status(200).json(new ApiResponse(200, { poster }, "Poster updated"));
});

export const deletePoster = asyncHandler(async (req, res) => {
  const poster = await Poster.findById(req.params.id);
  if (!poster) throw new ApiError(404, "Poster not found.");

  // DB record first: a failed Cloudinary cleanup leaves a harmless orphan,
  // not a live poster pointing at a deleted image.
  await poster.deleteOne();
  if (poster.image?.publicId) await deleteFromCloudinary(poster.image.publicId).catch(() => null);

  return res.status(200).json(new ApiResponse(200, null, "Poster deleted"));
});