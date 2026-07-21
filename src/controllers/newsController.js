import News from "../models/News.js";
import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import { uploadBufferToCloudinary, deleteFromCloudinary } from "../config/cloudinary.js";
import paginate from "../utils/paginate.js";

export const listPublicNews = asyncHandler(async (req, res) => {
  const result = await paginate(
    News,
    { status: "published" },
    { page: req.query.page, limit: req.query.limit, sortBy: "publishedAt", sortOrder: "desc" }
  );
  return res.status(200).json(new ApiResponse(200, result, "News fetched"));
});

export const getPublicNewsBySlug = asyncHandler(async (req, res) => {
  const article = await News.findOne({ slug: req.params.slug, status: "published" });
  if (!article) throw new ApiError(404, "Article not found.");
  return res.status(200).json(new ApiResponse(200, { article }, "Article fetched"));
});

export const listNewsAdmin = asyncHandler(async (req, res) => {
  const result = await paginate(News, {}, { page: req.query.page, limit: req.query.limit });
  return res.status(200).json(new ApiResponse(200, result, "News fetched"));
});

export const createNews = asyncHandler(async (req, res) => {
  let image = {};
  if (req.file) {
    const result = await uploadBufferToCloudinary(req.file.buffer, { folder: "kmcc_panchayath/news" });
    image = { url: result.secure_url, publicId: result.public_id };
  }

  const body = { ...req.body, image, createdBy: req.user.id };
  if (body.status === "published") body.publishedAt = new Date();

  const article = await News.create(body);
  return res.status(201).json(new ApiResponse(201, { article }, "News article created"));
});

export const updateNews = asyncHandler(async (req, res) => {
  const article = await News.findById(req.params.id);
  if (!article) throw new ApiError(404, "Article not found.");

  if (req.file) {
    if (article.image?.publicId) await deleteFromCloudinary(article.image.publicId).catch(() => null);
    const result = await uploadBufferToCloudinary(req.file.buffer, { folder: "kmcc_panchayath/news" });
    req.body.image = { url: result.secure_url, publicId: result.public_id };
  }

  if (req.body.status === "published" && article.status !== "published") {
    req.body.publishedAt = new Date();
  }

  Object.assign(article, req.body);
  await article.save();

  return res.status(200).json(new ApiResponse(200, { article }, "News article updated"));
});

export const deleteNews = asyncHandler(async (req, res) => {
  const article = await News.findById(req.params.id);
  if (!article) throw new ApiError(404, "Article not found.");

  if (article.image?.publicId) await deleteFromCloudinary(article.image.publicId).catch(() => null);
  await article.deleteOne();

  return res.status(200).json(new ApiResponse(200, null, "News article deleted"));
});
