import mongoose from "mongoose";

const membershipPlanSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, unique: true },
    price: { type: Number, required: true, min: 0 },
    duration: {
      // duration in months
      type: Number,
      required: true,
      min: 1,
    },
    description: { type: String, trim: true },
    benefits: [{ type: String, trim: true }],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const MembershipPlan = mongoose.model("MembershipPlan", membershipPlanSchema);

export default MembershipPlan;
