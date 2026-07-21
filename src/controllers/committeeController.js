// backend/controllers/committeeController.ts
import Committee from "../models/Committee.js";
import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import { uploadBufferToCloudinary, deleteFromCloudinary } from "../config/cloudinary.js";

export const listCommittee = asyncHandler(async (req, res) => {
  const filter = { isActive: true };
  if (req.query.type) filter.type = req.query.type;
  if (req.query.year) filter.year = Number(req.query.year);

  const members = await Committee.find(filter).sort({ type: 1, priority: 1 });
  return res.status(200).json(new ApiResponse(200, { members }, "Committee members fetched"));
});

export const listCommitteeAdmin = asyncHandler(async (req, res) => {
  const members = await Committee.find({}).sort({ type: 1, priority: 1 });
  return res.status(200).json(new ApiResponse(200, { members }, "Committee members fetched"));
});

export const createCommitteeMember = asyncHandler(async (req, res) => {
  let photo = {};
  if (req.file) {
    const result = await uploadBufferToCloudinary(req.file.buffer, { folder: "kmcc_panchayath/committee" });
    photo = { url: result.secure_url, publicId: result.public_id };
  }

  const member = await Committee.create({ ...req.body, photo });
  return res.status(201).json(new ApiResponse(201, { member }, "Committee member created"));
});

export const updateCommitteeMember = asyncHandler(async (req, res) => {
  const member = await Committee.findById(req.params.id);
  if (!member) throw new ApiError(404, "Committee member not found.");

  if (req.file) {
    if (member.photo?.publicId) await deleteFromCloudinary(member.photo.publicId).catch(() => null);
    const result = await uploadBufferToCloudinary(req.file.buffer, { folder: "kmcc_panchayath/committee" });
    req.body.photo = { url: result.secure_url, publicId: result.public_id };
  }

  Object.assign(member, req.body);
  await member.save();

  return res.status(200).json(new ApiResponse(200, { member }, "Committee member updated"));
});

export const deleteCommitteeMember = asyncHandler(async (req, res) => {
  const member = await Committee.findById(req.params.id);
  if (!member) throw new ApiError(404, "Committee member not found.");

  if (member.photo?.publicId) await deleteFromCloudinary(member.photo.publicId).catch(() => null);
  await member.deleteOne();

  return res.status(200).json(new ApiResponse(200, null, "Committee member deleted"));
});

export const reorderCommittee = asyncHandler(async (req, res) => {
  const { order } = req.body;
  if (!Array.isArray(order)) throw new ApiError(400, "order must be an array of { id, priority }.");

  await Promise.all(
    order.map(({ id, priority }) => Committee.findByIdAndUpdate(id, { priority }))
  );

  return res.status(200).json(new ApiResponse(200, null, "Committee order updated"));
});