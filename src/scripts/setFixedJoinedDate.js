// Reverts the joinedDate mistake from setFixedJoinedDate's earlier run:
// restores joinedDate to each member's own createdAt (their original
// account-creation timestamp), since createdAt was never touched.
//
// Run with: node src/scripts/setFixedJoinedDate.js
import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import { connectDB, disconnectDB } from "../config/db.js";
import Member from "../models/Member.js";

const run = async () => {
  await connectDB();

  const members = await Member.find({}, "_id createdAt");
  const ops = members.map((m) => ({
    updateOne: {
      filter: { _id: m._id },
      update: { $set: { joinedDate: m.createdAt } },
    },
  }));

  const result = ops.length ? await Member.bulkWrite(ops) : { modifiedCount: 0 };
  console.log(
    `[setFixedJoinedDate] Reverted joinedDate to createdAt on ${result.modifiedCount} member(s).`
  );

  await disconnectDB();
  await mongoose.connection.close().catch(() => {});
  process.exit(0);
};

run().catch((err) => {
  console.error("[setFixedJoinedDate] Failed:", err);
  process.exit(1);
});
