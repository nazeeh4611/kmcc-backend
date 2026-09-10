// One-time backfill: aligns every already-approved member onto the single
// shared Jan–Dec 2027 membership cycle (see FIXED_MEMBERSHIP_START /
// FIXED_MEMBERSHIP_EXPIRY in controllers/memberController.js, which apply
// this same period to every new approval going forward).
//
// Only touches members that already have a membershipStart set (i.e. have
// been approved at least once) — pending applicants get the fixed period
// automatically when they're approved, so they don't need backfilling.
//
// Run with: node src/scripts/setFixedMembershipPeriod.js
import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import { connectDB, disconnectDB } from "../config/db.js";
import Member from "../models/Member.js";

const FIXED_MEMBERSHIP_START = new Date("2027-01-01T12:00:00.000Z");
const FIXED_MEMBERSHIP_EXPIRY = new Date("2027-12-31T12:00:00.000Z");

const run = async () => {
  await connectDB();

  const now = new Date();
  const diffMs = FIXED_MEMBERSHIP_EXPIRY.getTime() - now.getTime();
  const daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  const isExpired = diffMs <= 0;

  const result = await Member.updateMany(
    { membershipStart: { $ne: null } },
    {
      $set: {
        membershipStart: FIXED_MEMBERSHIP_START,
        membershipExpiry: FIXED_MEMBERSHIP_EXPIRY,
        daysRemaining,
        isExpired,
      },
    }
  );
  console.log(
    `[setFixedMembershipPeriod] Set membershipStart=2027-01-01 / membershipExpiry=2027-12-31 on ${result.modifiedCount} member(s).`
  );

  await disconnectDB();
  await mongoose.connection.close().catch(() => {});
  process.exit(0);
};

run().catch((err) => {
  console.error("[setFixedMembershipPeriod] Failed:", err);
  process.exit(1);
});
