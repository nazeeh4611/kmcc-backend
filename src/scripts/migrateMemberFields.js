// One-time, additive migration for the registration-form overhaul.
//
// For every existing Member document:
//   - if `dob` is missing and `birthYear` is present, backfill
//     `dob = Jan 1 of birthYear` (a documented approximation — this is the
//     best available signal for old records that only ever collected a
//     birth year, not a full date).
//   - if both `homeCountryNumber` and `workingCountryNumber` are missing
//     and the legacy `phone` is present, backfill
//     `workingCountryNumber = phone`. The historical `phone` field was
//     collected as the member's contact number while abroad, which maps
//     most sensibly to "working country number" — `homeCountryNumber` is
//     left blank rather than duplicating the same value under both labels,
//     which would misleadingly imply two distinct numbers were collected.
//
// Nothing is deleted and no schema is dropped — this is a pure backfill of
// new fields from existing data. `zone` is intentionally left untouched:
// legacy values may not match the new fixed 11-value list, and the model
// does not enforce that list at the schema level for exactly this reason
// (see models/Member.js).
//
// Run with: node src/scripts/migrateMemberFields.js
import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import { connectDB, disconnectDB } from "../config/db.js";
import Member from "../models/Member.js";

const run = async () => {
  await connectDB();

  const dobResult = await Member.updateMany(
    { dob: { $in: [null, undefined] }, birthYear: { $exists: true, $ne: null } },
    [{ $set: { dob: { $dateFromParts: { year: "$birthYear", month: 1, day: 1 } } } }]
  );
  console.log(
    `[migrateMemberFields] Backfilled dob from birthYear on ${dobResult.modifiedCount} member(s).`
  );

  const phoneResult = await Member.updateMany(
    {
      homeCountryNumber: { $in: [null, undefined] },
      workingCountryNumber: { $in: [null, undefined] },
      phone: { $exists: true, $ne: null },
    },
    [{ $set: { workingCountryNumber: "$phone" } }]
  );
  console.log(
    `[migrateMemberFields] Backfilled workingCountryNumber from phone on ${phoneResult.modifiedCount} member(s).`
  );

  await disconnectDB();
  await mongoose.connection.close().catch(() => {});
  process.exit(0);
};

run().catch((err) => {
  console.error("[migrateMemberFields] Failed:", err);
  process.exit(1);
});
