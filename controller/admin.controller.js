import httpStatus from "http-status";
import { Contest } from "../model/contest.model.js";
import AppError from "../errors/AppError.js";
import sendResponse from "../utils/sendResponse.js";
import catchAsync from "../utils/catchAsync.js";
import { User } from "../model/user.model.js";

export const createContest = catchAsync(async (req, res) => {
  const { startDate, endDate, title, description } = req.body;
  if (!startDate || !endDate) {
    throw new AppError(httpStatus.BAD_REQUEST, "Start and end dates required");
  }
  if (new Date(startDate) >= new Date(endDate)) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Start date must be before end date"
    );
  }

  // Deactivate previous if active
  await Contest.updateMany({ isActive: true }, { isActive: false });

  const contest = await Contest.create({
    title: title || "Beard Contest",
    description: description || "Participate for our bearded community.",
    startDate: new Date(startDate),
    endDate: new Date(endDate),
    isActive: true,
  });

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Contest created",
    data: contest,
  });
});

export const getContests = catchAsync(async (req, res) => {
  const contests = await Contest.find()
    .populate({
      path: "participants",
      populate: { path: "user", select: "name avatar status" },
      options: { sort: { votes: -1 } }, // Leaderboard
    })
    .populate("winners", "photo votes submittedAt user status")
    .sort({ startDate: -1 });



  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Contests fetched",
    data: contests,
  });
});
export const getContestById = catchAsync(async (req, res) => {
  const contests = await Contest.findById(req.params.id)
    .populate({
      path: "participants",
      populate: { path: "user", select: "name avatar status" },
      options: { sort: { votes: -1 } }, // Leaderboard
    })
    .populate("winners", "photo votes submittedAt user status")
    .sort({ startDate: -1 });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Contests fetched",
    data: contests,
  });
});

export const updateContest = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { startDate, endDate, title, description } = req.body;
  if (!startDate || !endDate) {
    throw new AppError(httpStatus.BAD_REQUEST, "Start and end dates required");
  }
  if (new Date(startDate) >= new Date(endDate)) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Start date must be before end date"
    );
  }

  const contest = await Contest.findOne({ _id: id });
  if (!contest) throw new AppError(httpStatus.NOT_FOUND, "Contest not found");

  // Deactivate previous if active
  await Contest.updateMany({ isActive: true }, { isActive: false });

  await Contest.updateOne(
    { _id: id },
    {
      title: title || "Beard Contest",
      description: description || "Participate for our bearded community.",
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      isActive: true,
    }
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Contest updated",
  });
});

export const deleteContest = catchAsync(async (req, res) => {
  const { id } = req.params;
  const contest = await Contest.findOne({ _id: id });
  if (!contest) throw new AppError(httpStatus.NOT_FOUND, "Contest not found");

  // Deactivate previous if active
  await Contest.updateMany({ isActive: true }, { isActive: false });

  await Contest.deleteOne({ _id: id });
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Contest deleted",
  });
});

export const allUsersAndBerbers = catchAsync(async (req, res) => {
  const { role } = req.query;
  const filter = {};
  if (role) filter.role = role;

  const users = await User.find(filter);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Users fetched",
    data: users,
  });
});

export const updateUserStatus = catchAsync(async (req, res) => {
  const { userId } = req.params;
  const { status } = req.body;
  const user = await User.findOne({ _id: userId });
  if (!user) throw new AppError(httpStatus.NOT_FOUND, "User not found");

  await User.updateOne({ _id: userId }, { status });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "User status updated",
  });
});

export const deleteUser = catchAsync(async (req, res) => {
  const { userId } = req.params;
  const user = await User.findOne({ _id: userId });
  if (!user) throw new AppError(httpStatus.NOT_FOUND, "User not found");

  await User.deleteOne({ _id: userId });
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "User deleted",
  });
});
