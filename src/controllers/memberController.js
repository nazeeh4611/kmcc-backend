import Member from "../models/Member.js";
import MembershipPlan from "../models/MembershipPlan.js";
import Settings from "../models/Settings.js";
import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import paginate from "../utils/paginate.js";
import { uploadBufferToCloudinary, deleteFromCloudinary } from "../config/cloudinary.js";
import { generateMembershipCardPdf } from "../services/cardService.js";
import { exportMembersToExcel } from "../services/excelService.js";
import { sendWelcomeEmail } from "../services/emailService.js";

// Every member uses the same shared password by design (org-internal,
// public-facing data, no per-member security) — always "2026".
const generateTempPassword = () => "2026";

// Only one membership plan is actually offered — the 1-year plan. Resolved
// server-side (by duration, not a hardcoded ID, since the seeded ObjectId
// differs per environment) so approve/renew no longer need a plan picker.
const getDefaultMembershipPlan = async () => {
  const plan = await MembershipPlan.findOne({ duration: 12, isActive: true }).sort({ createdAt: 1 });
  if (!plan) {
    throw new ApiError(500, "No active 1-year membership plan is configured.");
  }
  return plan;
};

// All memberships expire on this single fixed date regardless of individual
// start date, so every member's cycle renews together at year end instead of
// on their personal anniversary. Anchored to noon UTC (not end-of-day) so it
// still reads as "31 Dec 2027" in every timezone members/admins actually use
// (India, Qatar, Saudi, UAE — all ahead of UTC) instead of rolling over to
// 1 Jan when a browser formats it in local time.
const FIXED_MEMBERSHIP_EXPIRY = new Date("2027-12-31T12:00:00.000Z");

export const publicRegisterMember = asyncHandler(async (req, res) => {
  const {
    fullName,
    fatherName,
    dob,
    bloodGroup,
    homeCountryNumber,
    workingCountryNumber,
    email,
    address,
    nomineeName,
    nomineeRelation,
    zone,
    workingCountry,
    workingCountryOther,
  } = req.body;

  if (!req.file) {
    throw new ApiError(400, "Photo is required.");
  }

  const duplicate = await Member.findOne({
    $or: [{ homeCountryNumber }, { workingCountryNumber }],
    membershipStatus: { $ne: "inactive" },
  });
  if (duplicate) {
    throw new ApiError(409, "An application with this mobile number already exists.");
  }

  let photo;
  try {
    const uploadResult = await uploadBufferToCloudinary(req.file.buffer, {
      folder: "kmcc_panchayath/members",
    });
    photo = { url: uploadResult.secure_url, publicId: uploadResult.public_id };
  } catch (cloudinaryError) {
    console.error("[publicRegisterMember] Cloudinary upload failed:", cloudinaryError.message);
    throw new ApiError(500, "Photo upload failed. Please try again.");
  }

  const memberData = {
    fullName,
    fatherName,
    dob,
    bloodGroup,
    homeCountryNumber,
    workingCountryNumber,
    email: email || undefined,
    address,
    nomineeName,
    nomineeRelation,
    zone: zone || null,
    workingCountry,
    workingCountryOther: workingCountry === "Other" ? workingCountryOther : null,
    photo,
    membershipStatus: "pending",
  };

  let member;
  try {
    member = await Member.create(memberData);
  } catch (dbError) {
    console.error("[publicRegisterMember] Member creation failed:", dbError.message);
    throw new ApiError(500, "Could not submit your application. Please try again.");
  }

  return res
    .status(201)
    .json(
      new ApiResponse(
        201,
        { applicationId: member._id, membershipId: member.membershipId },
        "Application submitted successfully. You will be notified once it is reviewed."
      )
    );
});

export const verifyMemberPublic = asyncHandler(async (req, res) => {
  const member = await Member.findOne({ membershipId: req.params.membershipId.toUpperCase() })
    .select("membershipId fullName photo membershipStatus membershipExpiry panchayath")
    .lean();

  if (!member) {
    throw new ApiError(404, "No membership record found for this ID.");
  }

  return res.status(200).json(new ApiResponse(200, { member }, "Membership verified"));
});

export const listMembers = asyncHandler(async (req, res) => {
  const { page, limit, search, status, bloodGroup, sortBy, sortOrder } = req.query;

  const filter = {};
  if (status) filter.membershipStatus = status;
  if (bloodGroup) filter.bloodGroup = bloodGroup;
  if (search) {
    filter.$or = [
      { fullName: new RegExp(search, "i") },
      { phone: new RegExp(search, "i") },
      { homeCountryNumber: new RegExp(search, "i") },
      { workingCountryNumber: new RegExp(search, "i") },
      { email: new RegExp(search, "i") },
      { membershipId: new RegExp(search, "i") },
    ];
  }

  const result = await paginate(Member, filter, {
    page,
    limit,
    sortBy,
    sortOrder,
    populate: [{ path: "membershipType", select: "title price duration" }],
  });

  return res.status(200).json(new ApiResponse(200, result, "Members fetched"));
});

export const getPendingMembers = asyncHandler(async (req, res) => {
  const result = await paginate(
    Member,
    { membershipStatus: "pending" },
    { page: req.query.page, limit: req.query.limit, sortBy: "createdAt", sortOrder: "desc" }
  );
  return res.status(200).json(new ApiResponse(200, result, "Pending applications fetched"));
});

export const getMemberById = asyncHandler(async (req, res) => {
  const member = await Member.findById(req.params.id)
    .populate("membershipType", "title price duration");

  if (!member) throw new ApiError(404, "Member not found.");

  return res.status(200).json(new ApiResponse(200, { member: member.toSafeObject() }, "Member fetched"));
});

export const approveMember = asyncHandler(async (req, res) => {
  const { membershipStart, password, committeeRole, unit } = req.body;

  const member = await Member.findById(req.params.id);
  if (!member) throw new ApiError(404, "Member not found.");
  if (member.membershipStatus !== "pending") {
    throw new ApiError(400, "Only pending applications can be approved.");
  }

  const plan = await getDefaultMembershipPlan();

  const start = membershipStart ? new Date(membershipStart) : new Date();
  const expiry = FIXED_MEMBERSHIP_EXPIRY;

  const plainPassword = password || generateTempPassword();

  member.password = plainPassword;
  member.membershipType = plan._id;
  member.membershipStart = start;
  member.membershipExpiry = expiry;
  member.membershipStatus = "active";
  member.committeeRole = committeeRole || member.committeeRole;
  member.unit = unit || member.unit;
  member.updatedBy = req.user.id;

  await member.save();

  if (member.email) {
    sendWelcomeEmail(member.email, member, password ? undefined : plainPassword).catch((err) =>
      console.error("[approveMember] Welcome email failed:", err.message)
    );
  }

  return res.status(200).json(
    new ApiResponse(
      200,
      { member: member.toSafeObject(), temporaryPassword: password ? undefined : plainPassword },
      "Member approved successfully"
    )
  );
});

export const rejectMember = asyncHandler(async (req, res) => {
  const member = await Member.findById(req.params.id);
  if (!member) throw new ApiError(404, "Member not found.");
  if (member.membershipStatus !== "pending") {
    throw new ApiError(400, "Only pending applications can be rejected.");
  }

  if (member.photo?.publicId) {
    await deleteFromCloudinary(member.photo.publicId).catch(() => null);
  }

  await member.deleteOne();

  return res.status(200).json(new ApiResponse(200, null, "Application rejected and removed"));
});

// Admin "Add Member" uses the exact same field set as public registration
// and always creates the member as "pending" — activation (with membership
// plan selection) happens through the same approveMember action used for
// public applications, so there's a single creation→approval pipeline.
export const createMember = asyncHandler(async (req, res) => {
  const {
    fullName,
    fatherName,
    dob,
    bloodGroup,
    homeCountryNumber,
    workingCountryNumber,
    email,
    address,
    nomineeName,
    nomineeRelation,
    zone,
    workingCountry,
    workingCountryOther,
  } = req.body;

  if (!req.file) {
    throw new ApiError(400, "Photo is required.");
  }

  const uploadResult = await uploadBufferToCloudinary(req.file.buffer, {
    folder: "kmcc_panchayath/members",
  });
  const photo = { url: uploadResult.secure_url, publicId: uploadResult.public_id };

  const memberData = {
    fullName,
    fatherName,
    dob,
    bloodGroup,
    homeCountryNumber,
    workingCountryNumber,
    email: email || undefined,
    address,
    nomineeName,
    nomineeRelation,
    zone: zone || null,
    workingCountry,
    workingCountryOther: workingCountry === "Other" ? workingCountryOther : null,
    photo,
    membershipStatus: "pending",
    createdBy: req.user.id,
    updatedBy: req.user.id,
  };

  const member = await Member.create(memberData);

  return res.status(201).json(
    new ApiResponse(
      201,
      { member: member.toSafeObject() },
      "Member created and added to the pending queue. Approve it to activate the membership."
    )
  );
});

export const updateMember = asyncHandler(async (req, res) => {
  const member = await Member.findById(req.params.id);
  if (!member) throw new ApiError(404, "Member not found.");

  const body = { ...req.body };

  if (body.workingCountry && body.workingCountry !== "Other") {
    body.workingCountryOther = null;
  }

  if (body.membershipId && body.membershipId !== member.membershipId) {
    const duplicate = await Member.findOne({
      membershipId: body.membershipId,
      _id: { $ne: member._id },
    });
    if (duplicate) {
      throw new ApiError(409, "This membership ID is already in use by another member.");
    }
  }

  if (req.file) {
    if (member.photo?.publicId) {
      await deleteFromCloudinary(member.photo.publicId).catch(() => null);
    }
    const uploadResult = await uploadBufferToCloudinary(req.file.buffer, {
      folder: "kmcc_panchayath/members",
    });
    body.photo = { url: uploadResult.secure_url, publicId: uploadResult.public_id };
  }

  delete body.password;
  Object.assign(member, body, { updatedBy: req.user.id });

  await member.save();

  return res.status(200).json(new ApiResponse(200, { member: member.toSafeObject() }, "Member updated"));
});

export const deleteMember = asyncHandler(async (req, res) => {
  const member = await Member.findById(req.params.id);
  if (!member) throw new ApiError(404, "Member not found.");

  if (member.photo?.publicId) {
    await deleteFromCloudinary(member.photo.publicId).catch(() => null);
  }

  await member.deleteOne();

  return res.status(200).json(new ApiResponse(200, null, "Member deleted"));
});

export const bulkDeleteMembers = asyncHandler(async (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) {
    throw new ApiError(400, "Provide an array of member IDs to delete.");
  }

  const result = await Member.deleteMany({ _id: { $in: ids } });

  return res
    .status(200)
    .json(new ApiResponse(200, { deletedCount: result.deletedCount }, "Members deleted"));
});

export const suspendMember = asyncHandler(async (req, res) => {
  const member = await Member.findById(req.params.id);
  if (!member) throw new ApiError(404, "Member not found.");

  member.membershipStatus = "suspended";
  member.updatedBy = req.user.id;
  member.refreshTokenVersion += 1;
  await member.save();

  return res.status(200).json(new ApiResponse(200, { member: member.toSafeObject() }, "Member suspended"));
});

export const reactivateMember = asyncHandler(async (req, res) => {
  const member = await Member.findById(req.params.id);
  if (!member) throw new ApiError(404, "Member not found.");
  if (member.membershipStatus !== "suspended") {
    throw new ApiError(400, "Only suspended members can be reactivated.");
  }

  member.membershipStatus = member.isExpired ? "expired" : "active";
  member.updatedBy = req.user.id;
  await member.save();

  return res.status(200).json(new ApiResponse(200, { member: member.toSafeObject() }, "Member reactivated"));
});

export const renewMembership = asyncHandler(async (req, res) => {
  const { membershipStart } = req.body;

  const member = await Member.findById(req.params.id);
  if (!member) throw new ApiError(404, "Member not found.");

  const plan = await getDefaultMembershipPlan();

  if (member.membershipStatus === "inactive" || member.membershipType) {
    member.membershipHistory.push({
      membershipType: member.membershipType,
      start: member.membershipStart,
      expiry: member.membershipExpiry,
      status: member.membershipStatus,
    });
  }

  const start = membershipStart ? new Date(membershipStart) : new Date();
  const expiry = FIXED_MEMBERSHIP_EXPIRY;

  member.membershipType = plan._id;
  member.membershipStart = start;
  member.membershipExpiry = expiry;
  member.membershipStatus = "active";
  member.isExpired = false;
  member.graceEndsAt = null;
  member.updatedBy = req.user.id;

  await member.save();

  return res.status(200).json(new ApiResponse(200, { member: member.toSafeObject() }, "Membership renewed"));
});

// Admin-only correction for members who already have a plan but whose
// recorded start date is wrong (e.g. it was defaulted to the approval
// timestamp instead of their real join date). Expiry stays pinned to
// FIXED_MEMBERSHIP_EXPIRY regardless — only the recorded start date changes.
// Unlike renewMembership, this does not archive the current cycle into
// membershipHistory — it's a data fix, not a new membership cycle.
export const updateMembershipStartDate = asyncHandler(async (req, res) => {
  const { membershipStart } = req.body;

  const member = await Member.findById(req.params.id).populate("membershipType", "duration");
  if (!member) throw new ApiError(404, "Member not found.");
  if (!member.membershipType) {
    throw new ApiError(400, "This member has no membership plan to recalculate a start date for.");
  }

  const start = new Date(membershipStart);
  const expiry = FIXED_MEMBERSHIP_EXPIRY;

  member.membershipStart = start;
  member.membershipExpiry = expiry;
  if (member.membershipStatus !== "suspended") {
    member.membershipStatus = expiry.getTime() > Date.now() ? "active" : "expired";
  }
  member.updatedBy = req.user.id;

  await member.save();

  return res
    .status(200)
    .json(new ApiResponse(200, { member: member.toSafeObject() }, "Membership start date updated"));
});

export const transferMembership = asyncHandler(async (req, res) => {
  const { newFullName, newPhone, newEmail, relation } = req.body;

  const member = await Member.findById(req.params.id);
  if (!member) throw new ApiError(404, "Member not found.");

  member.membershipHistory.push({
    status: `transferred_from:${member.fullName}${relation ? `(${relation})` : ""}`,
    start: member.membershipStart,
    expiry: member.membershipExpiry,
    membershipType: member.membershipType,
  });

  member.fullName = newFullName;
  member.phone = newPhone;
  member.email = newEmail || undefined;
  member.updatedBy = req.user.id;

  await member.save();

  return res
    .status(200)
    .json(new ApiResponse(200, { member: member.toSafeObject() }, "Membership transferred"));
});

export const resetMemberPassword = asyncHandler(async (req, res) => {
  const member = await Member.findById(req.params.id);
  if (!member) throw new ApiError(404, "Member not found.");

  const newPassword = req.body.newPassword || generateTempPassword();
  member.password = newPassword;
  member.refreshTokenVersion += 1;
  await member.save();

  return res.status(200).json(
    new ApiResponse(
      200,
      { temporaryPassword: req.body.newPassword ? undefined : newPassword },
      "Password reset successfully"
    )
  );
});

export const generateMemberCard = asyncHandler(async (req, res) => {
  const member = await Member.findById(req.params.id).populate("membershipType", "title");
  if (!member) throw new ApiError(404, "Member not found.");
  if (member.membershipStatus === "pending") {
    throw new ApiError(400, "Cannot generate a card for a pending application.");
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

export const exportMembers = asyncHandler(async (req, res) => {
  const { status } = req.query;
  const filter = status ? { membershipStatus: status } : {};

  const members = await Member.find(filter).populate("membershipType", "title").lean();
  const buffer = await exportMembersToExcel(members);

  res.set({
    "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "Content-Disposition": `attachment; filename="members-export-${Date.now()}.xlsx"`,
  });

  return res.status(200).send(buffer);
});

export const getMemberStats = asyncHandler(async (req, res) => {
  const now = new Date();
  const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const todayMonth = now.getMonth() + 1;
  const todayDate = now.getDate();

  const [total, active, expired, pending, suspended, upcomingExpiry, countryAgg, birthdaysToday] =
    await Promise.all([
      Member.countDocuments({}),
      Member.countDocuments({ membershipStatus: "active" }),
      Member.countDocuments({ membershipStatus: "expired" }),
      Member.countDocuments({ membershipStatus: "pending" }),
      Member.countDocuments({ membershipStatus: "suspended" }),
      Member.countDocuments({
        membershipStatus: "active",
        membershipExpiry: { $gte: new Date(), $lte: in30Days },
      }),
      Member.aggregate([
        { $match: { membershipStatus: { $in: ["active", "expired"] } } },
        { $group: { _id: "$workingCountry", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
      Member.aggregate([
        { $match: { dob: { $exists: true, $ne: null } } },
        {
          $addFields: { dobMonth: { $month: "$dob" }, dobDate: { $dayOfMonth: "$dob" } },
        },
        { $match: { dobMonth: todayMonth, dobDate: todayDate } },
        { $project: { fullName: 1, membershipId: 1, phone: 1, photo: 1 } },
      ]),
    ]);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        total,
        active,
        expired,
        pending,
        suspended,
        upcomingExpiry,
        countryStatistics: countryAgg.map((c) => ({ country: c._id || "Unknown", count: c.count })),
        todaysBirthdays: birthdaysToday,
      },
      "Member statistics fetched"
    )
  );
});

export const getMyMembershipDetails = asyncHandler(async (req, res) => {
  if (req.user.type !== "member") {
    throw new ApiError(403, "Only members can access this resource.");
  }

  const member = await Member.findById(req.user.id).populate("membershipType", "title price duration");
  if (!member) throw new ApiError(404, "Member not found.");

  return res.status(200).json(new ApiResponse(200, { member: member.toSafeObject() }, "Membership details fetched"));
});

export const downloadMyMembershipCard = asyncHandler(async (req, res) => {
  if (req.user.type !== "member") {
    throw new ApiError(403, "Only members can access this resource.");
  }

  const member = await Member.findById(req.user.id).populate("membershipType", "title");
  if (!member) throw new ApiError(404, "Member not found.");
  if (member.membershipStatus === "pending") {
    throw new ApiError(400, "Cannot generate a card for a pending application.");
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