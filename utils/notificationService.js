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

const LOCALE_MAP = {
  EN: "en-US",
  DE: "de-DE",
  FR: "fr-FR",
  ES: "es-ES",
  IT: "it-IT",
  NL: "nl-NL",
};

const normalizeLanguage = (value) => {
  if (!value) return "EN";
  const normalized = String(value).trim().toUpperCase();
  if (LANGUAGE_MAP[normalized]) return LANGUAGE_MAP[normalized];
  const prefix = normalized.slice(0, 2);
  return LANGUAGE_MAP[prefix] || "EN";
};

const formatPlaceholderValue = (value, locale) => {
  if (value instanceof Date) {
    return new Intl.DateTimeFormat(locale, {
      timeZone: "UTC",
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(value);
  }

  return value;
};

const fillPlaceholders = (text, placeholders = {}, locale = "en-US") => {
  if (typeof text !== "string") return text;
  return text.replace(/\{([^}]+)\}/g, (match, key) => {
    const value = formatPlaceholderValue(placeholders[key], locale);
    return value === undefined || value === null ? match : String(value);
  });
};

export const getLocalizedNotificationText = (type, language, placeholders = {}) => {
  const section = notificationData[type];
  if (!section) return "You have a new notification.";
  const langKey = normalizeLanguage(language);
  const template = section[langKey] || section.EN;
  const locale = LOCALE_MAP[langKey] || "en-US";
  return fillPlaceholders(template, placeholders, locale);
};

export const sendLocalizedNotification = async ({
  title,
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
  const notificationTitle =  title || type;

  if (saveToDb) {
    await Notification.create({
      user: userId,
      title: notificationTitle,
      message,
      type,
    });
  }

  await sendPushNotification([userId], notificationTitle, message);
};
