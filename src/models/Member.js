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
      minlength: 6,
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
    dob: { type: Date },
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
    nativePlace: { type: String, required: true, trim: true },
    workingCountry: { type: String, required: true, trim: true },

    zone: { type: String, default: null },
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

    refreshTokenVersion: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    lastLoginAt: { type: Date, default: null },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "Admin" },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Admin" },
  },
  { timestamps: true }
);

memberSchema.index({ fullName: "text", phone: "text", email: "text" });
memberSchema.index({ membershipExpiry: 1 });

memberSchema.pre("validate", async function preValidate(next) {
  if (!this.membershipId) {
    try {
      this.membershipId = await generateMembershipId();
    } catch (error) {
      return next(error);
    }
  }
  next();
});

memberSchema.pre("save", async function preSave(next) {
  if (!this.password) {
    this.password = await bcrypt.hash("2026", 12);
  }
  
  if (this.isModified("password") && this.password) {
    this.password = await bcrypt.hash(this.password, 12);
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
  return bcrypt.compare(candidate, this.password);
};

memberSchema.methods.toSafeObject = function toSafeObject() {
  const obj = this.toObject();
  delete obj.password;
  delete obj.refreshTokenVersion;
  return obj;
};

const Member = mongoose.model("Member", memberSchema);

export default Member;