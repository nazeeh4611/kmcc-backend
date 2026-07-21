import Member from "../models/Member.js";
import Settings from "../models/Settings.js";
import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import { generateMembershipCardPdf } from "../services/cardService.js";

/** GET /api/dashboard/card — logged-in member downloads their own card */
export const downloadOwnCard = asyncHandler(async (req, res) => {
  const member = await Member.findById(req.user.id).populate("membershipType", "title");
  if (!member) throw new ApiError(404, "Member not found.");
  if (member.membershipStatus === "pending") {
    throw new ApiError(400, "Your application is still pending review.");
  }

  const settings = await Settings.findOne({ singleton: "global_settings" }).lean();
  const pdfBuffer = await generateMembershipCardPdf(member.toObject(), settings);

  res.set({
    "Content-Type": "application/pdf",
    "Content-Disposition": `attachment; filename="${member.membershipId}-card.pdf"`,
    "Content-Length": pdfBuffer.length,
  });

  return res.status(200).send(pdfBuffer);
});

/**
 * POST /api/dashboard/profile-update-request
 * Member submits requested changes to their profile; an admin must review
 * and approve before they're applied (keeps identity data admin-controlled).
 */
export const requestProfileUpdate = asyncHandler(async (req, res) => {
  const member = await Member.findById(req.user.id);
  if (!member) throw new ApiError(404, "Member not found.");

  member.profileUpdateRequest = {
    requested: true,
    changes: req.body,
    status: "pending",
    requestedAt: new Date(),
  };

  await member.save();

  return res
    .status(200)
    .json(new ApiResponse(200, null, "Profile update request submitted for admin review"));
});

/** GET /api/dashboard/profile-update-requests — admin queue */
export const listProfileUpdateRequests = asyncHandler(async (req, res) => {
  const members = await Member.find({ "profileUpdateRequest.status": "pending" }).select(
    "membershipId fullName profileUpdateRequest"
  );

  return res.status(200).json(new ApiResponse(200, { requests: members }, "Pending profile update requests"));
});

/** POST /api/dashboard/profile-update-requests/:id/review — admin approve/reject */
export const reviewProfileUpdateRequest = asyncHandler(async (req, res) => {
  const { approve } = req.body;
  const member = await Member.findById(req.params.id);
  if (!member) throw new ApiError(404, "Member not found.");
  if (member.profileUpdateRequest?.status !== "pending") {
    throw new ApiError(400, "No pending profile update request for this member.");
  }

  if (approve) {
    Object.assign(member, member.profileUpdateRequest.changes);
    member.profileUpdateRequest.status = "approved";
  } else {
    member.profileUpdateRequest.status = "rejected";
  }

  member.profileUpdateRequest.reviewedAt = new Date();
  member.profileUpdateRequest.reviewedBy = req.user.id;
  member.updatedBy = req.user.id;

  await member.save();

  return res
    .status(200)
    .json(new ApiResponse(200, { member: member.toSafeObject() }, `Request ${approve ? "approved" : "rejected"}`));
});
