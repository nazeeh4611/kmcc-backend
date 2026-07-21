import mongoose from "mongoose";

const downloadSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    pdf: {
      url: { type: String, required: true },
      publicId: { type: String, required: true },
    },
    category: {
      type: String,
      enum: ["forms", "circulars", "reports", "certificates", "general"],
      default: "general",
    },
    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "Admin" },
  },
  { timestamps: true }
);

const Download = mongoose.model("Download", downloadSchema);

export default Download;
