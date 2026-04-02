import crypto from "crypto";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import fs from "fs/promises";
import path from "path";
import nodemailer from "nodemailer";

// Generate a random OTP
export const generateOTP = () => {
  const OTP_LENGTH = 6;
  const otp = Array.from({ length: OTP_LENGTH }, () =>
    crypto.randomInt(0, 9)
  ).join("");
  return otp;
};

//Generate unique ID
export const generateUniqueId = () => {
  const timestamp = Date.now().toString(36); // Convert current timestamp to base36 string
  const randomPart = Math.random().toString(36).substr(2, 6); // Get 6 random characters

  const uniquePart = timestamp + randomPart;
  const uniqueId = uniquePart.substring(0, 8);

  return `BK${uniqueId}`;
};

//password hashing
export const hashPassword = async (newPassword) => {
  const salt = await bcrypt.genSalt(Number.parseInt(10));
  const hashedPassword = await bcrypt.hash(newPassword, salt);
  return Promise.resolve(hashedPassword);
};

export const uniqueTransactionId = () => {
  return uuidv4().replace(/-/g, "").substr(0, 12).toUpperCase();
};

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export const sendOTP = async (email, code) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Verification Code",
    text: `Your verification code is: ${code}`,
  };
  await transporter.sendMail(mailOptions);
};

const uploadDir = path.resolve("public/uploads");

const getExtension = (fileName = "", mimeType = "") => {
  const existingExtension = path.extname(fileName).toLowerCase();
  if (existingExtension) return existingExtension;

  const mimeMap = {
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
    "image/svg+xml": ".svg",
    "image/heic": ".heic",
    "image/heif": ".heif",
  };

  return mimeMap[mimeType] || ".jpg";
};

const buildPublicUrl = (relativePath, baseUrlOverride = "") => {
  const baseUrl =
    baseUrlOverride ||
    process.env.PUBLIC_URL ||
    process.env.APP_URL ||
    process.env.BACKEND_URL;
  if (!baseUrl) return relativePath;

  const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  return new URL(relativePath.replace(/^\//, ""), normalizedBase).toString();
};

export const uploadToLocalStorage = async (file, options = {}) => {
  const buffer = Buffer.isBuffer(file) ? file : file?.buffer;
  if (!buffer) {
    throw new Error("File buffer is required");
  }

  await fs.mkdir(uploadDir, { recursive: true });

  const sourceName =
    (Buffer.isBuffer(file) ? options.originalname : file?.originalname) ||
    options.originalname ||
    "image";
  const sourceMime =
    (Buffer.isBuffer(file) ? options.mimetype : file?.mimetype) ||
    options.mimetype ||
    "image/jpeg";
  const extension = getExtension(sourceName, sourceMime);
  const fileName = `${crypto.randomUUID()}${extension}`;
  const filePath = path.join(uploadDir, fileName);

  await fs.writeFile(filePath, buffer);

  const publicPath = `/public/uploads/${fileName}`;
  const baseUrl = options.baseUrl || "";

  return {
    public_id: fileName,
    url: buildPublicUrl(publicPath, baseUrl),
    secure_url: buildPublicUrl(publicPath, baseUrl),
    path: filePath,
  };
};

export const uploadOnCloudinary = uploadToLocalStorage;
