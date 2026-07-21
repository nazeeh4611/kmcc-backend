import { z } from "zod";

export const familyMemberSchema = z.object({
  name: z.string().trim().min(2).max(150),
  relation: z.enum(["spouse", "son", "daughter", "father", "mother", "sibling", "other"]),
  dob: z.coerce.date().optional(),
  gender: z.enum(["male", "female", "other"]).optional(),
  phone: z.string().trim().max(20).optional(),
  bloodGroup: z.enum(["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "unknown"]).optional(),
  occupation: z.string().trim().max(150).optional(),
});

export const familyMemberUpdateSchema = familyMemberSchema.partial();
