import { z } from "zod";

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid ID");

export const publicRegisterSchema = z
  .object({
    zone: z.string().optional(),
    zoneOther: z.string().trim().max(150).optional(),
    nativePlace: z.string().trim().min(1, "Native place is required").max(150),
    coordinator: z.string().optional(),
    coordinatorOther: z.string().trim().max(150).optional(),
    workingCountry: z.string().trim().min(1, "Working country is required").max(100),
    mandalamCommittee: z.string().trim().max(150).optional(),
    fullName: z.string().trim().min(2, "Name is required").max(150),
    fatherName: z.string().trim().min(1, "Father's name is required").max(150),
    address: z.string().trim().min(1, "Address is required").max(500),
    bloodGroup: z.string().min(1, "Blood group is required"),
    phone: z
      .string()
      .trim()
      .regex(/^\+?[0-9\s\-()]{7,20}$/, "Enter a valid mobile number with country code"),
    email: z.string().trim().email("Enter a valid email").optional().or(z.literal("")),
    birthYear: z.coerce
      .number()
      .int()
      .min(1900, "Enter a valid 4-digit year")
      .max(new Date().getFullYear(), "Enter a valid 4-digit year"),
  })
  .refine((data) => data.zone || data.zoneOther, {
    message: "Select a Panchayath/Zone or specify one",
    path: ["zone"],
  })
  .refine((data) => data.coordinator || data.coordinatorOther, {
    message: "Select a coordinator or choose Not in List",
    path: ["coordinator"],
  });

export const approveMemberSchema = z.object({
  membershipType: objectId,
  membershipStart: z.coerce.date().optional(),
  password: z.string().min(6).optional(),
  committeeRole: z.string().trim().max(150).optional(),
  unit: z.string().trim().max(150).optional(),
});

export const adminCreateMemberSchema = z.object({
  fullName: z.string().trim().min(2).max(150),
  phone: z.string().trim().min(7).max(20),
  email: z.string().trim().email().optional().or(z.literal("")),
  gender: z.enum(["male", "female", "other"]),
  dob: z.coerce.date().optional(),
  bloodGroup: z.enum(["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "unknown"]).optional(),
  fatherName: z.string().trim().max(150).optional(),
  motherName: z.string().trim().max(150).optional(),
  address: z.string().trim().max(500).optional(),
  houseName: z.string().trim().max(150).optional(),
  place: z.string().trim().max(150).optional(),
  postOffice: z.string().trim().max(150).optional(),
  district: z.string().trim().max(150).optional(),
  state: z.string().trim().max(150).optional(),
  country: z.string().trim().max(100).optional(),
  workingCountry: z.string().trim().max(100).optional(),
  passportNumber: z.string().trim().max(50).optional(),
  civilId: z.string().trim().max(50).optional(),
  occupation: z.string().trim().max(150).optional(),
  zone: z.string().optional(),
  nativePlace: z.string().trim().max(150).optional(),
  committeeRole: z.string().trim().max(150).optional(),
  unit: z.string().trim().max(150).optional(),
  membershipType: objectId,
  membershipStart: z.coerce.date().optional(),
  password: z.string().min(6).optional(),
});

export const adminUpdateMemberSchema = adminCreateMemberSchema.partial().extend({
  membershipType: objectId.optional(),
});

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
  newPassword: z.string().min(6).optional(),
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