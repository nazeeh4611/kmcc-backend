import mongoose from "mongoose";

const zoneSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, unique: true }, // e.g. "വള്ളിക്കുന്ന്"
    nameEnglish: { type: String, trim: true, default: null },
    panchayath: { type: String, trim: true, default: "Anganganadi" },
    priority: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

zoneSchema.index({ isActive: 1, priority: 1 });

const Zone = mongoose.model("Zone", zoneSchema);

export default Zone;
