import cron from "node-cron";
import { Reservation } from "../model/reservation.model.js";
import { sendLocalizedNotification } from "./notificationService.js";

const buildDateRangeForTomorrow = () => {
  const now = new Date();
  const tomorrowStart = new Date(now);
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);
  tomorrowStart.setHours(0, 0, 0, 0);

  const tomorrowEnd = new Date(tomorrowStart);
  tomorrowEnd.setHours(23, 59, 59, 999);

  return { tomorrowStart, tomorrowEnd };
};

const sendTomorrowReminders = async () => {
  try {
    const { tomorrowStart, tomorrowEnd } = buildDateRangeForTomorrow();

    const reservations = await Reservation.find({
      status: "confirmed",
      date: { $gte: tomorrowStart, $lte: tomorrowEnd },
    }).populate("berber", "shopName");

    for (const reservation of reservations) {
      await sendLocalizedNotification({
        userId: reservation.user,
        type: "APPOINTMENT_REMINDER",
        placeholders: {
          barbershop_name: reservation.berber?.shopName || "Barbershop",
          time: reservation.time,
        },
      });
    }
  } catch (error) {
    console.error("Reservation reminder cron failed:", error);
  }
};

export const startCronJobs = () => {
  cron.schedule("0 7 * * *", async () => {
    console.log("Running reservation reminder cron job");
    await sendTomorrowReminders();
  });
};
