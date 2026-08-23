// One-time migration: reset every member's password to the shared org-wide
// default ("2026"), per explicit decision that member accounts don't need
// individual passwords. Run with: node src/scripts/resetAllMemberPasswords.js
import dotenv from "dotenv";
dotenv.config();

import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { connectDB, disconnectDB } from "../config/db.js";
import Member from "../models/Member.js";

const SHARED_PASSWORD = "2026";

const run = async () => {
  await connectDB();

  const hashed = await bcrypt.hash(SHARED_PASSWORD, 12);

  const result = await Member.updateMany(
    {},
    { $set: { password: hashed }, $inc: { refreshTokenVersion: 1 } }
  );

  console.log(
    `[resetAllMemberPasswords] Matched ${result.matchedCount}, updated ${result.modifiedCount} member(s) to the shared password.`
  );

  await disconnectDB();
  await mongoose.connection.close().catch(() => {});
  process.exit(0);
};

run().catch((err) => {
  console.error("[resetAllMemberPasswords] Failed:", err);
  process.exit(1);
});
