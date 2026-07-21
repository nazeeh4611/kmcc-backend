import mongoose from "mongoose";

const newsSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, unique: true, index: true },
    description: { type: String, required: true },
    image: {
      url: { type: String, default: null },
      publicId: { type: String, default: null },
    },
    status: { type: String, enum: ["draft", "published", "archived"], default: "draft" },
    publishedAt: { type: Date, default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "Admin" },
  },
  { timestamps: true }
);

newsSchema.pre("validate", function preValidate(next) {
  if (this.title && !this.slug) {
    this.slug = `${this.title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")}-${Date.now().toString().slice(-5)}`;
  }
  next();
});

const News = mongoose.model("News", newsSchema);

export default News;
