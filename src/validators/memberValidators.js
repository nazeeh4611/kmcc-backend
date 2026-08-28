import { z } from "zod";
import {
  ZONE_OPTIONS,
  WORKING_COUNTRY_OPTIONS,
  BLOOD_GROUP_OPTIONS,
  NOMINEE_RELATION_OPTIONS,
} from "../constants/memberOptions.js";

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid ID");
// Member passwords are 4-digit PINs — the member login form only accepts
// exactly 4 digits, so any custom password an admin sets must match too.
const memberPin = z.string().regex(/^\d{4}$/, "Password must be exactly 4 digits");

const phoneNumber = z
  .string()
  .trim()
  .regex(/^\+?[0-9\s\-()]{7,20}$/, "Enter a valid phone number with country code");

// Shared field set for the member form — used by BOTH public registration
// and the admin "Add Member" form so the two stay identical (mirrors
// frontend/src/lib/validators/memberSchema.ts).
const memberFormShape = {
  fullName: z.string().trim().min(2, "Full name is required").max(150),
  fatherName: z.string().trim().min(1, "Father's name is required").max(150),
  dob: z.coerce.date({ errorMap: () => ({ message: "Enter a valid date of birth" }) }),
  bloodGroup: z.enum(BLOOD_GROUP_OPTIONS, { errorMap: () => ({ message: "Blood group is required" }) }),
  homeCountryNumber: phoneNumber,
  workingCountryNumber: phoneNumber,
  email: z.string().trim().email("Enter a valid email").optional().or(z.literal("")),
  address: z.string().trim().min(1, "Address is required").max(500),
  nomineeName: z.string().trim().min(1, "Nominee name is required").max(150),
  nomineeRelation: z.enum(NOMINEE_RELATION_OPTIONS, {
    errorMap: () => ({ message: "Select the nominee's relation to you" }),
  }),
  zone: z.enum(ZONE_OPTIONS, { errorMap: () => ({ message: "Select a valid zone" }) }),
  workingCountry: z.enum(WORKING_COUNTRY_OPTIONS, {
    errorMap: () => ({ message: "Select a valid working country" }),
  }),
  workingCountryOther: z.string().trim().max(100).optional(),
};

const withWorkingCountryOtherRefine = (schema) =>
  schema.refine(
    (data) => data.workingCountry !== "Other" || Boolean(data.workingCountryOther?.trim()),
    {
      message: "Specify your working country",
      path: ["workingCountryOther"],
    }
  );

export const publicRegisterSchema = withWorkingCountryOtherRefine(z.object(memberFormShape));

export const approveMemberSchema = z.object({
  membershipType: objectId,
  membershipStart: z.coerce.date().optional(),
  password: memberPin.optional(),
  committeeRole: z.string().trim().max(150).optional(),
  unit: z.string().trim().max(150).optional(),
});

// Identical field set to publicRegisterSchema — admin "Add Member" uses the
// exact same form/fields as public registration (both always create the
// member as "pending"; membership plan selection only happens in the
// separate approve step above).
export const adminCreateMemberSchema = withWorkingCountryOtherRefine(z.object(memberFormShape));

export const adminUpdateMemberSchema = z
  .object({
    ...memberFormShape,
    // Admin-only: lets an admin renumber a member's membership ID (e.g. 1001, 1002).
    membershipId: z
      .string()
      .trim()
      .regex(/^\d+$/, "Membership ID must contain digits only")
      .optional(),
  })
  .partial()
  .refine(
    (data) => data.workingCountry !== "Other" || Boolean(data.workingCountryOther?.trim()),
    { message: "Specify your working country", path: ["workingCountryOther"] }
  );



export const renewMembershipSchema = z.object({
  membershipType: objectId,
  membershipStart: z.coerce.date().optional(),
});

export const suspendMemberSchema = z.object({
  reason: z.string().trim().max(300).optional(),
});

export const transferMembershipSchema = z.object({
  newFullName: z.string().trim().min(2).max(150),
  newPhone: z.string().trim().min(7).max(20),
  newEmail: z.string().trim().email().optional().or(z.literal("")),
  relation: z.string().trim().max(100).optional(),
});

export const resetMemberPasswordSchema = z.object({
  newPassword: memberPin.optional(),
});

export const zoneSchema = z.object({
  name: z.string().trim().min(1).max(150),
  nameEnglish: z.string().trim().max(150).optional(),
  priority: z.coerce.number().int().optional(),
});

export const coordinatorSchema = z.object({
  name: z.string().trim().min(1).max(150),
  zone: z.string().optional(),
  phone: z.string().trim().max(20).optional(),
});

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().optional(),
  status: z.enum(["active", "expired", "suspended", "inactive", "pending"]).optional(),
  district: z.string().trim().optional(),
  country: z.string().trim().optional(),
  bloodGroup: z.string().trim().optional(),
  sortBy: z.string().trim().default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});