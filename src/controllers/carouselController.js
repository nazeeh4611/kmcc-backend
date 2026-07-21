import Carousel from "../models/Carousel.js";
import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import { uploadBufferToCloudinary, deleteFromCloudinary } from "../config/cloudinary.js";

export const listPublicCarousel = asyncHandler(async (req, res) => {
  const slides = await Carousel.find({ isActive: true }).sort({ priority: -1, createdAt: -1 });
  return res.status(200).json(new ApiResponse(200, { slides }, "Carousel slides fetched"));
});

export const listCarouselAdmin = asyncHandler(async (req, res) => {
  const slides = await Carousel.find({}).sort({ priority: -1, createdAt: -1 });
  return res.status(200).json(new ApiResponse(200, { slides }, "Carousel slides fetched"));
});

export const createCarouselSlide = asyncHandler(async (req, res) => {
  if (!req.file) throw new ApiError(400, "Slide image is required.");

  const result = await uploadBufferToCloudinary(req.file.buffer, { folder: "kmcc_panchayath/carousel" });

  const slide = await Carousel.create({
    ...req.body,
    image: { url: result.secure_url, publicId: result.public_id },
  });

  return res.status(201).json(new ApiResponse(201, { slide }, "Carousel slide created"));
});

export const updateCarouselSlide = asyncHandler(async (req, res) => {
  const slide = await Carousel.findById(req.params.id);
  if (!slide) throw new ApiError(404, "Carousel slide not found.");

  if (req.file) {
    if (slide.image?.publicId) await deleteFromCloudinary(slide.image.publicId).catch(() => null);
    const result = await uploadBufferToCloudinary(req.file.buffer, { folder: "kmcc_panchayath/carousel" });
    req.body.image = { url: result.secure_url, publicId: result.public_id };
  }

  Object.assign(slide, req.body);
  await slide.save();

  return res.status(200).json(new ApiResponse(200, { slide }, "Carousel slide updated"));
});

export const deleteCarouselSlide = asyncHandler(async (req, res) => {
  const slide = await Carousel.findById(req.params.id);
  if (!slide) throw new ApiError(404, "Carousel slide not found.");

  if (slide.image?.publicId) await deleteFromCloudinary(slide.image.publicId).catch(() => null);
  await slide.deleteOne();

  return res.status(200).json(new ApiResponse(200, null, "Carousel slide deleted"));
});
