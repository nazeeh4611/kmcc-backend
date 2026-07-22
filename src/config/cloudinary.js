import { v2 as cloudinary } from "cloudinary";
import streamifier from "streamifier";

import dotenv from "dotenv";
dotenv.config();
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

console.log("[Cloudinary] Configured with cloud name:", process.env.CLOUDINARY_CLOUD_NAME);
console.log("[Cloudinary] API Key:", process.env.CLOUDINARY_API_KEY ? "Set" : "Not Set");
console.log("[Cloudinary] API Secret:", process.env.CLOUDINARY_API_SECRET ? "Set" : "Not Set"); 

/**
 * Upload a file buffer (from multer memoryStorage) to Cloudinary.
 * @param {Buffer} buffer
 * @param {object} options - { folder, resource_type, public_id, transformation }
 * @returns {Promise<object>} Cloudinary upload result
 */
export const uploadBufferToCloudinary = (buffer, options = {}) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: options.folder || "kmcc_panchayath/misc",
        resource_type: options.resource_type || "image",
        public_id: options.public_id,
        transformation: options.transformation,
        overwrite: true,
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );

    streamifier.createReadStream(buffer).pipe(uploadStream);
  });
};

export const deleteFromCloudinary = async (publicId, resourceType = "image") => {
  if (!publicId) return null;
  return cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
};

export default cloudinary;
