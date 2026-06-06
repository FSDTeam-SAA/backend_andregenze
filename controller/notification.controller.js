import httpStatus from "http-status";
import { Notification } from "../model/notification.model.js";
import { io } from "../server.js";
import sendResponse from "../utils/sendResponse.js";
import catchAsync from "../utils/catchAsync.js";

export const getNotifications = catchAsync(async (req, res) => {
  const { page = 1, limit = 10, type } = req.query;
  const filter = { user: req.user._id };
  if (type) filter.type = type;

  const notifications = await Notification.paginate(filter, {
    page: parseInt(page),
    limit: parseInt(limit),
    options: { sort: { createdAt: -1 } },
  });

  io.to(req.user._id.toString()).emit("notificationsUpdated", {
    updated: true,
  });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Notifications fetched successfully",
    data: notifications,
  });
});

export const markAsRead = catchAsync(async (req, res) => {
  const { id } = req.body;
  await Notification.findByIdAndUpdate(id, { isRead: true });
  io.to(req.user._id.toString()).emit("notificationsUpdated", {
    updated: true,
  });
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Notification marked as read",
  });
});


export const markAsReadAll = catchAsync(async (req, res) => {
  const userId = req.user._id;
  await Notification.updateMany({ user: userId, isRead: false }, { isRead: true });
  io.to(userId.toString()).emit("notificationsUpdated", {
    updated: true,
  });
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Notification marked as read",
  });
});