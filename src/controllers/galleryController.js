import Gallery from "../models/Gallery.js";
import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import { uploadBufferToCloudinary, deleteFromCloudinary } from "../config/cloudinary.js";

export const listPublicGalleries = asyncHandler(async (req, res) => {
  const filter = { isActive: true };
  if (req.query.category) filter.category = req.query.category;

  const galleries = await Gallery.find(filter).sort({ createdAt: -1 });
  return res.status(200).json(new ApiResponse(200, { galleries }, "Galleries fetched"));
});

export const listGalleriesAdmin = asyncHandler(async (req, res) => {
  const galleries = await Gallery.find({}).sort({ createdAt: -1 });
  return res.status(200).json(new ApiResponse(200, { galleries }, "Galleries fetched"));
});

export const createGallery = asyncHandler(async (req, res) => {
  const files = req.files || [];
  if (files.length === 0) throw new ApiError(400, "At least one image is required.");

  const uploads = await Promise.all(
    files.map((file) => uploadBufferToCloudinary(file.buffer, { folder: "kmcc_panchayath/gallery" }))
  );

  const images = uploads.map((u) => ({ url: u.secure_url, publicId: u.public_id }));

  const gallery = await Gallery.create({ ...req.body, images, createdBy: req.user.id });

  return res.status(201).json(new ApiResponse(201, { gallery }, "Gallery created"));
});

/** Add more images to an existing gallery */
export const addImagesToGallery = asyncHandler(async (req, res) => {
  const gallery = await Gallery.findById(req.params.id);
  if (!gallery) throw new ApiError(404, "Gallery not found.");

  const files = req.files || [];
  if (files.length === 0) throw new ApiError(400, "At least one image is required.");

  const uploads = await Promise.all(
    files.map((file) => uploadBufferToCloudinary(file.buffer, { folder: "kmcc_panchayath/gallery" }))
  );

  gallery.images.push(...uploads.map((u) => ({ url: u.secure_url, publicId: u.public_id })));
  await gallery.save();

  return res.status(200).json(new ApiResponse(200, { gallery }, "Images added"));
});

export const removeImageFromGallery = asyncHandler(async (req, res) => {
  const gallery = await Gallery.findById(req.params.id);
  if (!gallery) throw new ApiError(404, "Gallery not found.");

  const image = gallery.images.id(req.params.imageId);
  if (!image) throw new ApiError(404, "Image not found in this gallery.");

  if (image.publicId) await deleteFromCloudinary(image.publicId).catch(() => null);
  gallery.images.pull(req.params.imageId);
  await gallery.save();

  return res.status(200).json(new ApiResponse(200, { gallery }, "Image removed"));
});

export const updateGallery = asyncHandler(async (req, res) => {
  const gallery = await Gallery.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  if (!gallery) throw new ApiError(404, "Gallery not found.");

  return res.status(200).json(new ApiResponse(200, { gallery }, "Gallery updated"));
});

export const deleteGallery = asyncHandler(async (req, res) => {
  const gallery = await Gallery.findById(req.params.id);
  if (!gallery) throw new ApiError(404, "Gallery not found.");

  await Promise.all(
    gallery.images.map((img) => (img.publicId ? deleteFromCloudinary(img.publicId).catch(() => null) : null))
  );

  await gallery.deleteOne();

  return res.status(200).json(new ApiResponse(200, null, "Gallery deleted"));
});
