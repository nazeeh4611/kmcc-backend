// backend/models/Committee.ts
import mongoose from "mongoose";

const committeeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    designation: { type: String, required: true, trim: true },
    photo: {
      url: { type: String, default: null },
      publicId: { type: String, default: null },
    },
    priority: { type: Number, default: 0, index: true },
    year: { type: Number, required: true, default: () => new Date().getFullYear() },
    type: {
      type: String,
      enum: ["executive", "secretariat", "it_team", "womens_wing", "youth_wing"],
      required: true,
    },
    phone: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

committeeSchema.index({ type: 1, year: 1, priority: 1 });

const Committee = mongoose.model("Committee", committeeSchema);

export default Committee;