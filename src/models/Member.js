import mongoose from "mongoose";
import bcrypt from "bcryptjs";

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
      uppercase: true,
      trim: true,
      index: true,
      // Auto-generated as a PENDING-* placeholder for public self-registrations
      // and replaced with a proper GKAP-YYYY-###### ID when admin approves.
    },
    familyId: {
      type: String,
      trim: true,
      default: null,
      index: true,
    },
    password: {
      type: String,
      minlength: 6,
      select: false,
      // Not required at the document level: public self-registrations start
      // without a password and get one issued at approval time.
    },

    // Personal details
    fullName: { type: String, required: true, trim: true, maxlength: 150 },
    photo: { type: imageSchema, default: () => ({}) },
    fatherName: { type: String, trim: true },
    motherName: { type: String, trim: true },
    dob: { type: Date },
    birthYear: {
      // Captured directly on the public registration form (4-digit year);
      // dob can be completed later by the member/admin for full accuracy.
      type: Number,
      min: 1900,
      max: new Date().getFullYear(),
    },
    gender: { type: String, enum: ["male", "female", "other"], default: "male" },
    bloodGroup: {
      type: String,
      enum: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "unknown"],
      default: "unknown",
    },

    // Contact
    phone: {
      type: String,
      required: true,
      trim: true,
      match: [/^[0-9+\-\s()]{7,20}$/, "Enter a valid phone number"],
    },
    whatsapp: { type: String, trim: true },
    email: {
      type: String,
      lowercase: true,
      trim: true,
      sparse: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Enter a valid email"],
    },

    // Address
    address: { type: String, trim: true },
    houseName: { type: String, trim: true },
    place: { type: String, trim: true },
    postOffice: { type: String, trim: true },
    district: { type: String, trim: true },
    state: { type: String, trim: true },
    country: { type: String, trim: true, default: "India" },
    workingCountry: { type: String, trim: true },

    // Registration-form specific fields (mirrors the public KMCC form)
    zone: { type: mongoose.Schema.Types.ObjectId, ref: "Zone", default: null },
    zoneOther: { type: String, trim: true, default: null }, // used when "Not in list" is chosen
    nativePlace: { type: String, trim: true }, // "നാട്ടിലെ സ്ഥലം"
    coordinator: { type: mongoose.Schema.Types.ObjectId, ref: "Coordinator", default: null },
    coordinatorOther: { type: String, trim: true, default: null }, // "Not in List"
    mandalamCommittee: { type: String, trim: true, default: "രൂപീകരിച്ചിട്ടില്ല" }, // free text / "not yet formed"

    // Identity documents
    passportNumber: { type: String, trim: true },
    civilId: { type: String, trim: true },
    occupation: { type: String, trim: true },

    // Membership lifecycle
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

    // Organization
    committeeRole: { type: String, trim: true, default: null },
    panchayath: { type: String, trim: true, default: "Anganganadi" },
    unit: { type: String, trim: true },

    // Media
    cloudinaryImage: { type: imageSchema, default: () => ({}) },

    // Membership history archive (kept when a member is renewed under a
    // brand-new membership after permanent inactivation)
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

memberSchema.index({ fullName: "text", phone: "text", email: "text", passportNumber: "text" });
memberSchema.index({ membershipExpiry: 1 });
memberSchema.index({ district: 1, country: 1 });

memberSchema.pre("validate", function preValidatePlaceholderId(next) {
  if (!this.membershipId) {
    const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
    this.membershipId = `PENDING-${Date.now().toString().slice(-6)}${rand}`;
  }
  next();
});

memberSchema.pre("save", async function preSave(next) {
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
