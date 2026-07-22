import Member from "../models/Member.js";
import Zone from "../models/Zone.js";
import Coordinator from "../models/Coordinator.js";
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
import bcrypt from "bcryptjs";

const generateTempPassword = () => Math.random().toString(36).slice(-8);
const DEFAULT_PASSWORD = "2026";

export const publicRegisterMember = async (req, res) => {
  try {
    console.log("===== STARTING REGISTRATION =====");
    console.log("Request body:", JSON.stringify(req.body, null, 2));
    console.log("File received:", req.file ? "Yes" : "No");

    const {
      zone,
      zoneOther,
      nativePlace,
      coordinator,
      coordinatorOther,
      workingCountry,
      mandalamCommittee,
      fullName,
      fatherName,
      address,
      bloodGroup,
      phone,
      email,
      birthYear,
    } = req.body;

    if (!req.file) {
      console.log("ERROR: No photo file");
      return res.status(400).json({ success: false, message: "Photo is required." });
    }

    console.log("Checking for duplicate phone...");
    const duplicate = await Member.findOne({ phone, membershipStatus: { $ne: "inactive" } });
    if (duplicate) {
      console.log("ERROR: Duplicate phone found");
      return res.status(409).json({ 
        success: false, 
        message: "An application with this mobile number already exists." 
      });
    }

    console.log("Uploading to Cloudinary...");
    let photo;
    try {
      const uploadResult = await uploadBufferToCloudinary(req.file.buffer, {
        folder: "kmcc_panchayath/members",
      });
      photo = { url: uploadResult.secure_url, publicId: uploadResult.public_id };
      console.log("Cloudinary upload successful");
    } catch (cloudinaryError) {
      console.error("Cloudinary upload failed:", cloudinaryError);
      return res.status(500).json({ 
        success: false, 
        message: "Photo upload failed", 
        error: cloudinaryError.message 
      });
    }

    console.log("Preparing member data...");
    const memberData = {
      zone: zone || null,
      zoneOther: zoneOther || null,
      nativePlace,
      coordinator: coordinator || null,
      coordinatorOther: coordinatorOther || null,
      workingCountry,
      mandalamCommittee: mandalamCommittee || "രൂപീകരിച്ചിട്ടില്ല",
      fullName,
      fatherName,
      address,
      bloodGroup,
      phone,
      email: email || undefined,
      birthYear: parseInt(birthYear),
      gender: "male",
      photo,
      membershipStatus: "pending",
    };

    console.log("Creating member in database...");
    let member;
    try {
      member = await Member.create(memberData);
      console.log("Member created successfully:", member._id);
    } catch (dbError) {
      console.error("Database creation failed:", dbError);
      return res.status(500).json({ 
        success: false, 
        message: "Database creation failed", 
        error: dbError.message 
      });
    }

    console.log("===== REGISTRATION SUCCESS =====");
    return res
      .status(201)
      .json(
        new ApiResponse(
          201,
          { applicationId: member._id, membershipId: member.membershipId },
          "Application submitted successfully. You will be notified once it is reviewed."
        )
      );
  } catch (error) {
    console.error("===== UNHANDLED ERROR =====");
    console.error("Error details:", error);
    return res.status(500).json({ 
      success: false, 
      message: "Internal server error", 
      error: error.message 
    });
  }
};

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
  const { membershipType, membershipStart, password, committeeRole, unit } = req.body;

  const member = await Member.findById(req.params.id);
  if (!member) throw new ApiError(404, "Member not found.");
  if (member.membershipStatus !== "pending") {
    throw new ApiError(400, "Only pending applications can be approved.");
  }

  const plan = await MembershipPlan.findById(membershipType);
  if (!plan || !plan.isActive) throw new ApiError(400, "Selected membership plan is invalid.");

  const start = membershipStart ? new Date(membershipStart) : new Date();
  const expiry = new Date(start);
  expiry.setMonth(expiry.getMonth() + plan.duration);

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
    sendWelcomeEmail(member.email, member).catch((err) =>
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

export const createMember = asyncHandler(async (req, res) => {
  const body = req.body;

  if (!req.file) {
    throw new ApiError(400, "Photo is required.");
  }

  const plan = await MembershipPlan.findById(body.membershipType);
  if (!plan || !plan.isActive) throw new ApiError(400, "Selected membership plan is invalid.");

  const start = body.membershipStart ? new Date(body.membershipStart) : new Date();
  const expiry = new Date(start);
  expiry.setMonth(expiry.getMonth() + plan.duration);

  const uploadResult = await uploadBufferToCloudinary(req.file.buffer, {
    folder: "kmcc_panchayath/members",
  });
  const photo = { url: uploadResult.secure_url, publicId: uploadResult.public_id };

  const plainPassword = body.password || generateTempPassword();

  const member = await Member.create({
    ...body,
    password: plainPassword,
    membershipType: plan._id,
    membershipStart: start,
    membershipExpiry: expiry,
    membershipStatus: "active",
    photo,
    createdBy: req.user.id,
    updatedBy: req.user.id,
  });

  if (member.email) {
    sendWelcomeEmail(member.email, member).catch((err) =>
      console.error("[createMember] Welcome email failed:", err.message)
    );
  }

  return res.status(201).json(
    new ApiResponse(
      201,
      { member: member.toSafeObject(), temporaryPassword: body.password ? undefined : plainPassword },
      "Member created successfully"
    )
  );
});

export const updateMember = asyncHandler(async (req, res) => {
  const member = await Member.findById(req.params.id);
  if (!member) throw new ApiError(404, "Member not found.");

  const body = { ...req.body };

  if (body.membershipType) {
    const plan = await MembershipPlan.findById(body.membershipType);
    if (!plan || !plan.isActive) throw new ApiError(400, "Selected membership plan is invalid.");
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
  const { membershipType, membershipStart } = req.body;

  const member = await Member.findById(req.params.id);
  if (!member) throw new ApiError(404, "Member not found.");

  const plan = await MembershipPlan.findById(membershipType);
  if (!plan || !plan.isActive) throw new ApiError(400, "Selected membership plan is invalid.");

  if (member.membershipStatus === "inactive" || member.membershipType) {
    member.membershipHistory.push({
      membershipType: member.membershipType,
      start: member.membershipStart,
      expiry: member.membershipExpiry,
      status: member.membershipStatus,
    });
  }

  const start = membershipStart ? new Date(membershipStart) : new Date();
  const expiry = new Date(start);
  expiry.setMonth(expiry.getMonth() + plan.duration);

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