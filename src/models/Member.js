// models/Member.js
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import generateMembershipId from "../utils/generateMembershipId.js";

const imageSchema = new mongoose.Schema(
  {
    url: { type: String, default: null },
    publicId: { type: String, default: null },
  },
  { _id: false }
);

const memberSchema = new mongoose.Schema(
  {
    membershipId: {
      type: String,
      unique: true,
      trim: true,
      index: true,
    },
    password: {
      type: String,
      minlength: 4,
      select: false,
    },

    fullName: { type: String, required: true, trim: true, maxlength: 150 },
    fatherName: { type: String, required: true, trim: true, maxlength: 150 },
    photo: {
      type: imageSchema,
      required: [true, "Photo is required."],
      validate: {
        validator: (value) => Boolean(value && value.url),
        message: "Photo is required.",
      },
    },
    // Date of birth — the current member-facing field. Left non-required at
    // the schema level (validated as required in Zod for new
    // registrations/admin-create only) so a plain .save() on a legacy
    // member who only has `birthYear` never fails full-document validation.
    dob: { type: Date, default: null },
    // Legacy field, superseded by `dob`. Kept for old records; no longer
    // collected or displayed anywhere in the UI.
    birthYear: {
      type: Number,
      min: 1900,
      max: new Date().getFullYear(),
    },
    gender: { type: String, enum: ["male", "female", "other"], default: "male" },
    bloodGroup: {
      type: String,
      enum: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "unknown"],
      required: true,
    },

    // Two contact numbers collected on the new form. Non-required at the
    // schema level for the same legacy-save-safety reason as `dob` — a
    // member created before this change won't have these set yet.
    homeCountryNumber: { type: String, trim: true, default: null },
    workingCountryNumber: { type: String, trim: true, default: null },
    // Legacy single contact number. No longer collected on the form —
    // auto-derived from workingCountryNumber/homeCountryNumber on
    // create/update so existing consumers (search, Excel export, card
    // fallback) keep working unchanged.
    phone: {
      type: String,
      required: true,
      trim: true,
      match: [/^[0-9+\-\s()]{7,20}$/, "Enter a valid phone number"],
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
      sparse: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Enter a valid email"],
    },

    address: { type: String, required: true, trim: true },
    // Legacy fields, removed from the registration/admin-create form.
    // Kept in the schema for old records only.
    nativePlace: { type: String, trim: true },
    workingCountry: { type: String, required: true, trim: true },
    // Free-text country name captured only when workingCountry === "Other".
    workingCountryOther: { type: String, trim: true, default: null },

    // Fixed 11-value list (see constants/memberOptions.js). Not constrained
    // by a schema-level enum — legacy records may hold an older Zone
    // ObjectId string, and a mongoose enum validator runs against the
    // whole document on every .save(), which would break unrelated admin
    // actions (suspend/renew/etc.) on those older records. The allowed
    // values are enforced at the Zod layer for new registrations/edits.
    zone: { type: String, trim: true, default: null },
    zoneOther: { type: String, trim: true, default: null },
    coordinator: { type: String, default: null },
    coordinatorOther: { type: String, trim: true, default: null },
    mandalamCommittee: { type: String, trim: true, default: "രൂപീകരിച്ചിട്ടില്ല" },

    joinedDate: { type: Date, default: Date.now },
    membershipStatus: {
      type: String,
      enum: ["active", "expired", "suspended", "inactive", "pending"],
      default: "pending",
      index: true,
    },
    membershipType: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MembershipPlan",
      default: null,
    },
    membershipStart: { type: Date, default: null },
    membershipExpiry: { type: Date, default: null },
    daysRemaining: { type: Number, default: 0 },
    isExpired: { type: Boolean, default: false },
    graceEndsAt: { type: Date, default: null },

    committeeRole: { type: String, trim: true, default: null },
    panchayath: { type: String, trim: true, default: "Anganganadi" },
    unit: { type: String, trim: true },

    membershipHistory: [
      {
        membershipType: { type: mongoose.Schema.Types.ObjectId, ref: "MembershipPlan" },
        start: Date,
        expiry: Date,
        status: String,
        archivedAt: { type: Date, default: Date.now },
      },
    ],

    profileUpdateRequest: {
      requested: { type: Boolean, default: false },
      changes: { type: mongoose.Schema.Types.Mixed, default: null },
      status: { type: String, enum: ["none", "pending", "approved", "rejected"], default: "none" },
      requestedAt: Date,
      reviewedAt: Date,
      reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Admin" },
    },

    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    emailVerificationToken: {
      type: String,
      select: false,
    },
    emailVerificationExpires: {
      type: Date,
      select: false,
    },

    refreshTokenVersion: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    lastLoginAt: { type: Date, default: null },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "Admin" },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Admin" },
  },
  { timestamps: true }
);

memberSchema.index({
  fullName: "text",
  phone: "text",
  email: "text",
  homeCountryNumber: "text",
  workingCountryNumber: "text",
});
memberSchema.index({ membershipExpiry: 1 });

memberSchema.pre("validate", async function preValidate(next) {
  if (!this.membershipId) {
    try {
      this.membershipId = await generateMembershipId();
    } catch (error) {
      return next(error);
    }
  }

  // `phone` is no longer collected directly — keep it in sync with the new
  // contact fields so legacy consumers (search, Excel export, card
  // fallback) that still read `member.phone` keep working unchanged. Must
  // run in pre-validate (not pre-save) since `phone` is a required field
  // and Mongoose runs required-field checks during validation, which
  // happens before any pre-save hook.
  if (this.workingCountryNumber || this.homeCountryNumber) {
    this.phone = this.workingCountryNumber || this.homeCountryNumber;
  }

  next();
});

memberSchema.pre("save", async function preSave(next) {
  if (this.isModified("password") && this.password) {
    try {
      this.password = await bcrypt.hash(this.password, 12);
    } catch (error) {
      return next(error);
    }
  }

  if (this.isNew && !this.password) {
    try {
      this.password = await bcrypt.hash("2026", 12);
    } catch (error) {
      return next(error);
    }
  }

  if (this.membershipExpiry) {
    const now = new Date();
    const diffMs = new Date(this.membershipExpiry).getTime() - now.getTime();
    this.daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
    this.isExpired = diffMs <= 0;
    if (this.isExpired && this.membershipStatus === "active") {
      this.membershipStatus = "expired";
    }
  }

  next();
});

memberSchema.methods.comparePassword = async function comparePassword(candidate) {
  if (!candidate || !this.password) {
    return false;
  }
  
  try {
    return await bcrypt.compare(candidate, this.password);
  } catch (error) {
    console.error("Password comparison error:", error);
    return false;
  }
};

memberSchema.methods.toSafeObject = function toSafeObject() {
  const obj = this.toObject();
  delete obj.password;
  delete obj.refreshTokenVersion;
  delete obj.emailVerificationToken;
  delete obj.emailVerificationExpires;
  return obj;
};

const Member = mongoose.model("Member", memberSchema);

export default Member;