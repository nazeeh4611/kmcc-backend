import dotenv from "dotenv";
dotenv.config();

import { connectDB, disconnectDB } from "../config/db.js";
import Admin from "../models/Admin.js";
import Settings from "../models/Settings.js";
import MembershipPlan from "../models/MembershipPlan.js";

const seed = async () => {
  await connectDB();
  console.log("[Seed] Connected. Seeding initial data...");

  // Super Admin
  const existingSuperAdmin = await Admin.findOne({ role: "super_admin" });
  if (!existingSuperAdmin) {
    await Admin.create({
      name: process.env.SUPER_ADMIN_NAME || "Super Admin",
      email: process.env.SUPER_ADMIN_EMAIL,
      password: process.env.SUPER_ADMIN_PASSWORD,
      role: "super_admin",
    });
    console.log(`[Seed] Super admin created: ${process.env.SUPER_ADMIN_EMAIL}`);
  } else {
    console.log("[Seed] Super admin already exists. Skipping.");
  }

  // Settings singleton
  const existingSettings = await Settings.findOne({ singleton: "global_settings" });
  if (!existingSettings) {
    await Settings.create({
      siteName: "Global KMCC Anganganadi Panchayath",
      email: process.env.SUPER_ADMIN_EMAIL,
    });
    console.log("[Seed] Default settings created.");
  }

  // Default membership plans
  const plans = [
    { title: "Annual Membership", price: 500, duration: 12, description: "Standard 1-year membership" },
    { title: "3-Year Membership", price: 1300, duration: 36, description: "Discounted 3-year membership" },
    { title: "Lifetime Membership", price: 5000, duration: 1200, description: "100-year effective lifetime membership" },
  ];

  for (const plan of plans) {
    const exists = await MembershipPlan.findOne({ title: plan.title });
    if (!exists) {
      await MembershipPlan.create(plan);
      console.log(`[Seed] Membership plan created: ${plan.title}`);
    }
  }

  console.log("[Seed] Done.");
  await disconnectDB();
  process.exit(0);
};

seed().catch((err) => {
  console.error("[Seed] Failed:", err);
  process.exit(1);
});
