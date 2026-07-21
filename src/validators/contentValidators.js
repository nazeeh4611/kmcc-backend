import { z } from "zod";

export const committeeSchema = z.object({
  name: z.string().trim().min(2).max(150),
  designation: z.string().trim().min(2).max(150),
  priority: z.coerce.number().int().optional(),
  year: z.coerce.number().int().optional(),
  type: z.enum(["executive", "secretariat", "it_team", "womens_wing", "youth_wing"]),
  phone: z.string().trim().max(20).optional(),
  email: z.string().trim().email().optional().or(z.literal("")),
});
export const committeeUpdateSchema = committeeSchema.partial();

export const posterSchema = z.object({
  title: z.string().trim().min(2).max(200),
  link: z.string().trim().url().optional().or(z.literal("")),
  priority: z.coerce.number().int().optional(),
  status: z.enum(["draft", "published", "scheduled", "archived"]).optional(),
  publishAt: z.coerce.date().optional(),
  expireAt: z.coerce.date().optional(),
});
export const posterUpdateSchema = posterSchema.partial();

export const gallerySchema = z.object({
  title: z.string().trim().min(2).max(200),
  category: z.enum(["events", "meetings", "celebrations", "community", "general"]).optional(),
});
export const galleryUpdateSchema = gallerySchema.partial();

export const newsSchema = z.object({
  title: z.string().trim().min(2).max(200),
  description: z.string().trim().min(1),
  status: z.enum(["draft", "published", "archived"]).optional(),
});
export const newsUpdateSchema = newsSchema.partial();

export const eventSchema = z.object({
  title: z.string().trim().min(2).max(200),
  date: z.coerce.date(),
  time: z.string().trim().max(20).optional(),
  venue: z.string().trim().max(200).optional(),
  description: z.string().trim().optional(),
  status: z.enum(["upcoming", "ongoing", "completed", "cancelled"]).optional(),
});
export const eventUpdateSchema = eventSchema.partial();

export const carouselSchema = z.object({
  title: z.string().trim().min(2).max(200),
  button: z.string().trim().max(50).optional(),
  link: z.string().trim().url().optional().or(z.literal("")),
  priority: z.coerce.number().int().optional(),
  isActive: z.coerce.boolean().optional(),
});
export const carouselUpdateSchema = carouselSchema.partial();

export const downloadSchema = z.object({
  title: z.string().trim().min(2).max(200),
  category: z.enum(["forms", "circulars", "reports", "certificates", "general"]).optional(),
});
export const downloadUpdateSchema = downloadSchema.partial();

export const settingsSchema = z.object({
  siteName: z.string().trim().min(1).max(200).optional(),
  address: z.string().trim().max(500).optional(),
  email: z.string().trim().email().optional().or(z.literal("")),
  phone: z.string().trim().max(20).optional(),
  mapEmbedUrl: z.string().trim().max(1000).optional(),
  emergencyContact: z.string().trim().max(100).optional(),
  socialLinks: z
    .object({
      facebook: z.string().trim().max(300).optional(),
      instagram: z.string().trim().max(300).optional(),
      twitter: z.string().trim().max(300).optional(),
      youtube: z.string().trim().max(300).optional(),
      whatsapp: z.string().trim().max(300).optional(),
    })
    .partial()
    .optional(),
  seo: z
    .object({
      metaTitle: z.string().trim().max(200).optional(),
      metaDescription: z.string().trim().max(500).optional(),
    })
    .partial()
    .optional(),
});
