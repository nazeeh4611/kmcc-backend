// One-time backfill: sets membershipStart to 1 Jan 2027 on every existing
// member. Does not touch membershipExpiry/daysRemaining/isExpired.
//
// Run with: node src/scripts/setMembershipStartDate.js
import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import { connectDB, disconnectDB } from "../config/db.js";
import Member from "../models/Member.js";

const FIXED_MEMBERSHIP_START = new Date("2027-01-01T00:00:00.000Z");

const run = async () => {
  await connectDB();

  const result = await Member.updateMany(
    {},
    { $set: { membershipStart: FIXED_MEMBERSHIP_START } }
  );
  console.log(
    `[setMembershipStartDate] Set membershipStart=2027-01-01 on ${result.modifiedCount} member(s).`
  );

  await disconnectDB();
  await mongoose.connection.close().catch(() => {});
  process.exit(0);
};

run().catch((err) => {
  console.error("[setMembershipStartDate] Failed:", err);
  process.exit(1);
});
