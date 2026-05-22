import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { User } from "../model/user.model.js";
import { Notification } from "../model/notification.model.js";
import { sendPushNotification } from "./sendPushNotification.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const notificationDataPath = path.join(__dirname, "notification.json");
const notificationData = JSON.parse(
  fs.readFileSync(notificationDataPath, { encoding: "utf-8" }),
);

const LANGUAGE_MAP = {
  EN: "EN",
  DE: "DE",
  FR: "FR",
  ES: "ES",
  IT: "IT",
  NL: "NL",
};

const normalizeLanguage = (value) => {
  if (!value) return "EN";
  const normalized = String(value).trim().toUpperCase();
  if (LANGUAGE_MAP[normalized]) return LANGUAGE_MAP[normalized];
  const prefix = normalized.slice(0, 2);
  return LANGUAGE_MAP[prefix] || "EN";
};

const fillPlaceholders = (text, placeholders = {}) => {
  if (typeof text !== "string") return text;
  return text.replace(/\{([^}]+)\}/g, (match, key) => {
    const value = placeholders[key];
    return value === undefined || value === null ? match : String(value);
  });
};

export const getLocalizedNotificationText = (type, language, placeholders = {}) => {
  const section = notificationData[type];
  if (!section) return "You have a new notification.";
  const langKey = normalizeLanguage(language);
  const template = section[langKey] || section.EN;
  return fillPlaceholders(template, placeholders);
};

export const sendLocalizedNotification = async ({
  userId,
  type,
  placeholders = {},
  saveToDb = true,
}) => {
  if (!userId || !type) return;

  const user = await User.findById(userId).select("selectedLanguage name");
  if (!user) return;

  const message = getLocalizedNotificationText(
    type,
    user.selectedLanguage || user.language || "EN",
    placeholders,
  );
  const title = String(message).split("\n")[0].slice(0, 45);

  if (saveToDb) {
    await Notification.create({
      user: userId,
      title,
      message,
      type,
    });
  }

  await sendPushNotification([userId], title, message);
};
