import Settings from "../models/Settings.js";
import asyncHandler from "../utils/asyncHandler.js";
import ApiResponse from "../utils/ApiResponse.js";
import { uploadBufferToCloudinary, deleteFromCloudinary } from "../config/cloudinary.js";

const getOrCreateSettings = async () => {
  let settings = await Settings.findOne({ singleton: "global_settings" });
  if (!settings) settings = await Settings.create({ singleton: "global_settings" });
  return settings;
};

export const getPublicSettings = asyncHandler(async (req, res) => {
  const settings = await getOrCreateSettings();
  return res.status(200).json(new ApiResponse(200, { settings }, "Settings fetched"));
});

export const getSettingsAdmin = asyncHandler(async (req, res) => {
  const settings = await getOrCreateSettings();
  return res.status(200).json(new ApiResponse(200, { settings }, "Settings fetched"));
});

export const updateSettings = asyncHandler(async (req, res) => {
  const settings = await getOrCreateSettings();

  Object.assign(settings, req.body);
  if (req.body.socialLinks) settings.socialLinks = { ...settings.socialLinks, ...req.body.socialLinks };
  if (req.body.seo) settings.seo = { ...settings.seo, ...req.body.seo };

  await settings.save();

  return res.status(200).json(new ApiResponse(200, { settings }, "Settings updated"));
});

export const updateLogo = asyncHandler(async (req, res) => {
  const settings = await getOrCreateSettings();

  if (settings.logo?.publicId) await deleteFromCloudinary(settings.logo.publicId).catch(() => null);
  const result = await uploadBufferToCloudinary(req.file.buffer, { folder: "kmcc_panchayath/branding" });
  settings.logo = { url: result.secure_url, publicId: result.public_id };
  await settings.save();

  return res.status(200).json(new ApiResponse(200, { settings }, "Logo updated"));
});

export const updateFavicon = asyncHandler(async (req, res) => {
  const settings = await getOrCreateSettings();

  if (settings.favicon?.publicId) await deleteFromCloudinary(settings.favicon.publicId).catch(() => null);
  const result = await uploadBufferToCloudinary(req.file.buffer, { folder: "kmcc_panchayath/branding" });
  settings.favicon = { url: result.secure_url, publicId: result.public_id };
  await settings.save();

  return res.status(200).json(new ApiResponse(200, { settings }, "Favicon updated"));
});
