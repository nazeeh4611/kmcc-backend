import Counter from "../models/Counter.js";

const generateMembershipId = async () => {
  let counter = await Counter.findById("membershipId");

  if (!counter) {
    try {
      counter = await Counter.create({ _id: "membershipId", seq: 1000 });
    } catch (error) {
      if (error.code !== 11000) {
        throw error;
      }
    }
  }

  const updated = await Counter.findOneAndUpdate(
    { _id: "membershipId" },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );

  return String(updated.seq);
};

export default generateMembershipId;