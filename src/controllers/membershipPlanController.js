import MembershipPlan from "../models/MembershipPlan.js";
import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";

export const listMembershipPlans = asyncHandler(async (req, res) => {
  const filter = req.query.activeOnly === "true" ? { isActive: true } : {};
  const plans = await MembershipPlan.find(filter).sort({ price: 1 });
  return res.status(200).json(new ApiResponse(200, { plans }, "Membership plans fetched"));
});

export const createMembershipPlan = asyncHandler(async (req, res) => {
  const plan = await MembershipPlan.create(req.body);
  return res.status(201).json(new ApiResponse(201, { plan }, "Membership plan created"));
});

export const updateMembershipPlan = asyncHandler(async (req, res) => {
  const plan = await MembershipPlan.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  if (!plan) throw new ApiError(404, "Membership plan not found.");
  return res.status(200).json(new ApiResponse(200, { plan }, "Membership plan updated"));
});

export const deleteMembershipPlan = asyncHandler(async (req, res) => {
  const plan = await MembershipPlan.findByIdAndDelete(req.params.id);
  if (!plan) throw new ApiError(404, "Membership plan not found.");
  return res.status(200).json(new ApiResponse(200, null, "Membership plan deleted"));
});
