import mongoose from "mongoose";

const posterSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    image: {
      url: { type: String, required: true },
      publicId: { type: String, required: true },
    },
    link: { type: String, trim: true, default: null },
    priority: { type: Number, default: 0 },
    status: { type: String, enum: ["draft", "published", "scheduled", "archived"], default: "draft" },
    publishAt: { type: Date, default: null },
    expireAt: { type: Date, default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "Admin" },
  },
  { timestamps: true }
);

posterSchema.index({ status: 1, priority: -1 });

const Poster = mongoose.model("Poster", posterSchema);

export default Poster;
