import FamilyMember from "../models/FamilyMember.js";
import Member from "../models/Member.js";
import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import { uploadBufferToCloudinary, deleteFromCloudinary } from "../config/cloudinary.js";

/**
 * Resolves which member's family list is being accessed:
 * - Admins pass an explicit :memberId route param
 * - Members can only manage their own family list (req.user.id)
 */
const resolveMemberId = (req) => {
  if (req.user.type === "member") return req.user.id;
  if (req.params.memberId) return req.params.memberId;
  throw new ApiError(400, "memberId is required.");
};

export const listFamilyMembers = asyncHandler(async (req, res) => {
  const memberId = resolveMemberId(req);
  const familyMembers = await FamilyMember.find({ memberId }).sort({ createdAt: 1 });
  return res.status(200).json(new ApiResponse(200, { familyMembers }, "Family members fetched"));
});

export const addFamilyMember = asyncHandler(async (req, res) => {
  const memberId = resolveMemberId(req);

  const parent = await Member.findById(memberId);
  if (!parent) throw new ApiError(404, "Parent member not found.");

  let photo = {};
  if (req.file) {
    const uploadResult = await uploadBufferToCloudinary(req.file.buffer, {
      folder: "kmcc_panchayath/family_members",
    });
    photo = { url: uploadResult.secure_url, publicId: uploadResult.public_id };
  }

  const familyMember = await FamilyMember.create({ ...req.body, memberId, photo });

  return res.status(201).json(new ApiResponse(201, { familyMember }, "Family member added"));
});

export const updateFamilyMember = asyncHandler(async (req, res) => {
  const memberId = resolveMemberId(req);

  const familyMember = await FamilyMember.findOne({ _id: req.params.id, memberId });
  if (!familyMember) throw new ApiError(404, "Family member not found.");

  if (req.file) {
    if (familyMember.photo?.publicId) {
      await deleteFromCloudinary(familyMember.photo.publicId).catch(() => null);
    }
    const uploadResult = await uploadBufferToCloudinary(req.file.buffer, {
      folder: "kmcc_panchayath/family_members",
    });
    req.body.photo = { url: uploadResult.secure_url, publicId: uploadResult.public_id };
  }

  Object.assign(familyMember, req.body);
  await familyMember.save();

  return res.status(200).json(new ApiResponse(200, { familyMember }, "Family member updated"));
});

export const deleteFamilyMember = asyncHandler(async (req, res) => {
  const memberId = resolveMemberId(req);

  const familyMember = await FamilyMember.findOne({ _id: req.params.id, memberId });
  if (!familyMember) throw new ApiError(404, "Family member not found.");

  if (familyMember.photo?.publicId) {
    await deleteFromCloudinary(familyMember.photo.publicId).catch(() => null);
  }

  await familyMember.deleteOne();

  return res.status(200).json(new ApiResponse(200, null, "Family member removed"));
});
