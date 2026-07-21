import Download from "../models/Download.js";
import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import { uploadBufferToCloudinary, deleteFromCloudinary } from "../config/cloudinary.js";

export const listPublicDownloads = asyncHandler(async (req, res) => {
  const filter = { isActive: true };
  if (req.query.category) filter.category = req.query.category;

  const downloads = await Download.find(filter).sort({ createdAt: -1 });
  return res.status(200).json(new ApiResponse(200, { downloads }, "Downloads fetched"));
});

export const listDownloadsAdmin = asyncHandler(async (req, res) => {
  const downloads = await Download.find({}).sort({ createdAt: -1 });
  return res.status(200).json(new ApiResponse(200, { downloads }, "Downloads fetched"));
});

export const createDownload = asyncHandler(async (req, res) => {
  if (!req.file) throw new ApiError(400, "PDF file is required.");

  const result = await uploadBufferToCloudinary(req.file.buffer, {
    folder: "kmcc_panchayath/downloads",
    resource_type: "raw",
  });

  const download = await Download.create({
    ...req.body,
    pdf: { url: result.secure_url, publicId: result.public_id },
    createdBy: req.user.id,
  });

  return res.status(201).json(new ApiResponse(201, { download }, "Download created"));
});

export const updateDownload = asyncHandler(async (req, res) => {
  const download = await Download.findById(req.params.id);
  if (!download) throw new ApiError(404, "Download not found.");

  if (req.file) {
    if (download.pdf?.publicId) await deleteFromCloudinary(download.pdf.publicId, "raw").catch(() => null);
    const result = await uploadBufferToCloudinary(req.file.buffer, {
      folder: "kmcc_panchayath/downloads",
      resource_type: "raw",
    });
    req.body.pdf = { url: result.secure_url, publicId: result.public_id };
  }

  Object.assign(download, req.body);
  await download.save();

  return res.status(200).json(new ApiResponse(200, { download }, "Download updated"));
});

export const deleteDownload = asyncHandler(async (req, res) => {
  const download = await Download.findById(req.params.id);
  if (!download) throw new ApiError(404, "Download not found.");

  if (download.pdf?.publicId) await deleteFromCloudinary(download.pdf.publicId, "raw").catch(() => null);
  await download.deleteOne();

  return res.status(200).json(new ApiResponse(200, null, "Download deleted"));
});
