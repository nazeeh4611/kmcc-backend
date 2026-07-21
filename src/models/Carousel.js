import mongoose from "mongoose";

const carouselSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    image: {
      url: { type: String, required: true },
      publicId: { type: String, required: true },
    },
    button: { type: String, trim: true, default: null },
    link: { type: String, trim: true, default: null },
    priority: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

carouselSchema.index({ isActive: 1, priority: -1 });

const Carousel = mongoose.model("Carousel", carouselSchema);

export default Carousel;
