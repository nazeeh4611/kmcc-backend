import Carousel from "../models/Carousel.js";
import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import { uploadBufferToCloudinary, deleteFromCloudinary } from "../config/cloudinary.js";

const TITLE_MAX = 120;
const EDITABLE = ["title", "description", "button", "link", "priority", "isActive"];
const FOLDER = "kmcc_panchayath/carousel";

// Whitelist body fields so clients can't set image, _id, timestamps, etc.
const pickEditable = (body = {}) =>
  Object.fromEntries(EDITABLE.filter((key) => body[key] !== undefined).map((key) => [key, body[key]]));

// Validates and normalizes in place. Runs BEFORE any Cloudinary call.
const validateFields = (fields, { requireTitle }) => {
  if (requireTitle && fields.title === undefined) {
    throw new ApiError(400, "Title is required.");
  }

  if (fields.title !== undefined) {
    fields.title = String(fields.title).trim();
    if (fields.title.length < 2 || fields.title.length > TITLE_MAX) {
      throw new ApiError(400, `Title must be 2–${TITLE_MAX} characters.`);
    }
  }

  if (fields.description !== undefined) {
    // Multipart encoding turns \n into \r\n; normalize so the count matches the UI.
    fields.description = String(fields.description).replace(/\r\n/g, "\n").trim();
  
  }

  if (fields.priority !== undefined) {
    fields.priority = Number(fields.priority);
    if (!Number.isFinite(fields.priority)) {
      throw new ApiError(400, "Priority must be a number.");
    }
  }

  if (fields.isActive !== undefined) {
    if (fields.isActive === "true" || fields.isActive === true) fields.isActive = true;
    else if (fields.isActive === "false" || fields.isActive === false) fields.isActive = false;
    else throw new ApiError(400, "isActive must be true or false.");
  }

  return fields;
};

export const listPublicCarousel = asyncHandler(async (req, res) => {
  const slides = await Carousel.find({ isActive: true })
    .select("title description image.url createdAt")
    .sort({ priority: -1, createdAt: -1 })
    .lean();
  return res.status(200).json(new ApiResponse(200, { slides }, "Carousel slides fetched"));
});

export const listCarouselAdmin = asyncHandler(async (req, res) => {
  const slides = await Carousel.find({}).sort({ priority: -1, createdAt: -1 }).lean();
  return res.status(200).json(new ApiResponse(200, { slides }, "Carousel slides fetched"));
});

export const createCarouselSlide = asyncHandler(async (req, res) => {
  if (!req.file) throw new ApiError(400, "Slide image is required.");

  // Validate first: a bad request must not cost a Cloudinary upload.
  const fields = validateFields(pickEditable(req.body), { requireTitle: true });

  const result = await uploadBufferToCloudinary(req.file.buffer, { folder: FOLDER });

  try {
    const slide = await Carousel.create({
      ...fields,
      image: { url: result.secure_url, publicId: result.public_id },
    });
    return res.status(201).json(new ApiResponse(201, { slide }, "Carousel slide created"));
  } catch (error) {
    // DB write failed after the upload: don't leave an orphan behind.
    await deleteFromCloudinary(result.public_id).catch(() => null);
    throw error;
  }
});

export const updateCarouselSlide = asyncHandler(async (req, res) => {
  const slide = await Carousel.findById(req.params.id);
  if (!slide) throw new ApiError(404, "Carousel slide not found.");

  const fields = validateFields(pickEditable(req.body), { requireTitle: false });
  const oldPublicId = slide.image?.publicId;

  let uploaded = null;
  if (req.file) {
    uploaded = await uploadBufferToCloudinary(req.file.buffer, { folder: FOLDER });
    slide.image = { url: uploaded.secure_url, publicId: uploaded.public_id };
  }

  Object.assign(slide, fields);

  try {
    await slide.save();
  } catch (error) {
    // Save failed: discard the new upload, keep the old image intact.
    if (uploaded) await deleteFromCloudinary(uploaded.public_id).catch(() => null);
    throw error;
  }

  // Only remove the old image once the new state is safely persisted.
  if (uploaded && oldPublicId) await deleteFromCloudinary(oldPublicId).catch(() => null);

  return res.status(200).json(new ApiResponse(200, { slide }, "Carousel slide updated"));
});

export const deleteCarouselSlide = asyncHandler(async (req, res) => {
  const slide = await Carousel.findById(req.params.id);
  if (!slide) throw new ApiError(404, "Carousel slide not found.");

  // DB record first: if Cloudinary cleanup fails you get an orphaned file
  // (harmless), not a live slide pointing at a deleted image (visible breakage).
  await slide.deleteOne();
  if (slide.image?.publicId) await deleteFromCloudinary(slide.image.publicId).catch(() => null);

  return res.status(200).json(new ApiResponse(200, null, "Carousel slide deleted"));
});