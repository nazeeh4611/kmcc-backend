import mongoose from "mongoose";

const settingsSchema = new mongoose.Schema(
  {
    singleton: { type: String, default: "global_settings", unique: true },
    siteName: { type: String, default: "Global KMCC Anganganadi Panchayath" },
    logo: {
      url: { type: String, default: null },
      publicId: { type: String, default: null },
    },
    favicon: {
      url: { type: String, default: null },
      publicId: { type: String, default: null },
    },
    address: { type: String, default: "" },
    email: { type: String, default: "" },
    phone: { type: String, default: "" },
    socialLinks: {
      facebook: { type: String, default: "" },
      instagram: { type: String, default: "" },
      twitter: { type: String, default: "" },
      youtube: { type: String, default: "" },
      whatsapp: { type: String, default: "" },
    },
    seo: {
      metaTitle: { type: String, default: "" },
      metaDescription: { type: String, default: "" },
      ogImage: { type: String, default: "" },
    },
    mapEmbedUrl: { type: String, default: "" },
    emergencyContact: { type: String, default: "" },
  },
  { timestamps: true }
);

const Settings = mongoose.model("Settings", settingsSchema);

export default Settings;
