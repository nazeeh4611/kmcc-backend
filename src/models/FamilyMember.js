import mongoose from "mongoose";

const familyMemberSchema = new mongoose.Schema(
  {
    memberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Member",
      required: true,
    },
    name: { type: String, required: true, trim: true, maxlength: 150 },
    relation: {
      type: String,
      required: true,
      enum: ["spouse", "son", "daughter", "father", "mother", "sibling", "other"],
    },
    photo: {
      url: { type: String, default: null },
      publicId: { type: String, default: null },
    },
    dob: { type: Date },
    gender: { type: String, enum: ["male", "female", "other"] },
    phone: { type: String, trim: true },
    bloodGroup: {
      type: String,
      enum: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "unknown"],
      default: "unknown",
    },
    occupation: { type: String, trim: true },
  },
  { timestamps: true }
);

familyMemberSchema.index({ memberId: 1 });

const FamilyMember = mongoose.model("FamilyMember", familyMemberSchema);

export default FamilyMember;
