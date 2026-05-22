// import { FCM } from "../module/fcm/fcm.model.js";
import { FCM } from "../model/fcm.model.js";
import admin from "./firebase.js";
// import User from "../models/User";

export const sendPushNotification = async (
  userIds,
  title,
  body
) => {
  try {
    // Get users with FCM tokens
    // const users = await User.find({
    //   _id: { $in: userIds },
    //   fcmToken: { $exists: true, $ne: null },
    // }).select("fcmToken");
    const users = await FCM.find({
      user: { $in: userIds },
      fcmToken: { $exists: true, $ne: null },
    }).select("fcmToken");

    const tokens = users
      .map((u) => u.fcmToken)
      .filter((token) => typeof token === 'string' && token.length > 0);

    console.log(`Found ${tokens.length} FCM tokens for notification.`);

    if (!tokens.length) return;

    const message = {
      notification: {
        title,
        body,
      },
      tokens,
    };

    const response = await admin.messaging().sendEachForMulticast(message);

    console.log("Push sent:", response.successCount);
  } catch (error) {
    console.error("FCM Error:", error);
  }
};