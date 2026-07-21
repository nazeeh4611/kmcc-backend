import mongoose from "mongoose";

const coordinatorSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    zone: { type: mongoose.Schema.Types.ObjectId, ref: "Zone", default: null },
    phone: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

coordinatorSchema.index({ zone: 1, isActive: 1 });

const Coordinator = mongoose.model("Coordinator", coordinatorSchema);

export default Coordinator;
