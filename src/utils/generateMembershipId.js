import Member from "../models/Member.js";

/**
 * Generates a sequential, human-readable membership ID such as
 * GKAP-2026-000123. Falls back to a timestamp-based suffix if a
 * race condition is detected on the sequence lookup.
 */
const generateMembershipId = async () => {
  const year = new Date().getFullYear();
  const prefix = `GKAP-${year}-`;

  const lastMember = await Member.findOne({ membershipId: new RegExp(`^${prefix}`) })
    .sort({ createdAt: -1 })
    .select("membershipId")
    .lean();

  let nextSeq = 1;

  if (lastMember?.membershipId) {
    const lastSeq = parseInt(lastMember.membershipId.split("-").pop(), 10);
    if (!Number.isNaN(lastSeq)) nextSeq = lastSeq + 1;
  }

  const padded = String(nextSeq).padStart(6, "0");
  const candidateId = `${prefix}${padded}`;

  const exists = await Member.exists({ membershipId: candidateId });
  if (exists) {
    return `${prefix}${Date.now().toString().slice(-6)}`;
  }

  return candidateId;
};

export default generateMembershipId;
