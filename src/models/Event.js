import mongoose from "mongoose";

const eventSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    date: { type: Date, required: true, index: true },
    time: { type: String, trim: true },
    venue: { type: String, trim: true },
    image: {
      url: { type: String, default: null },
      publicId: { type: String, default: null },
    },
    description: { type: String },
    status: { type: String, enum: ["upcoming", "ongoing", "completed", "cancelled"], default: "upcoming" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "Admin" },
  },
  { timestamps: true }
);

const Event = mongoose.model("Event", eventSchema);

export default Event;
