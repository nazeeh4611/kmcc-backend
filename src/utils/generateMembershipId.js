import mongoose from "mongoose";

const BASE_ID = 1001;

// Picks the smallest unused numeric ID starting at 1001, so IDs freed by a
// deleted member get reused by the next member instead of the sequence
// climbing forever. Looked up against the Member model at call time (not
// imported statically) to avoid a circular import with Member.js, which
// imports this file.
const generateMembershipId = async () => {
  const Member = mongoose.model("Member");
  const members = await Member.find({}, { membershipId: 1, _id: 0 }).lean();
  const used = new Set(members.map((m) => Number(m.membershipId)).filter((n) => Number.isInteger(n)));

  let candidate = BASE_ID;
  while (used.has(candidate)) candidate++;
  return String(candidate);
};

export default generateMembershipId;
