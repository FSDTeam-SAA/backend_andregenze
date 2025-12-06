import httpStatus from "http-status";
import { User } from "../model/user.model.js";
import { uploadOnCloudinary } from "../utils/commonMethod.js";
import AppError from "../errors/AppError.js";
import sendResponse from "../utils/sendResponse.js";
import catchAsync from "../utils/catchAsync.js";
import { Contest } from "../model/contest.model.js";
import { Review } from "../model/review.model.js";
import { Reservation } from "../model/reservation.model.js";

export const getProfile = catchAsync(async (req, res) => {
  const user = await User.findById(req.user._id).select(
    "-password -refreshToken -verificationInfo -password_reset_token"
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Profile fetched",
    data: user,
  });
});

export const updateProfile = catchAsync(async (req, res) => {
  const updates = req.body;
  const user = await User.findById(req.user._id);

  if (updates.name) user.name = updates.name;
  if (updates.dob) user.dob = updates.dob;
  if (updates.shopName) user.shopName = updates.shopName;
  if (updates.phone) user.phone = updates.phone;
  if (updates.address && typeof updates.address === "string")
    user.address = updates.address;
  if (updates.address && typeof updates.address === "object")
    user.address = { ...user.address, ...updates.address };
  if (updates.language) user.language = updates.language;

  if (updates.contactPersonName)
    user.contactPersonName = updates.contactPersonName;
  if (updates.shopDescription) user.shopDescription = updates.shopDescription;
  if (updates.socialMedia)
    user.socialMedia = { ...user.socialMedia, ...updates.socialMedia };
  if (updates.staffMembers) user.staffMembers = updates.staffMembers;
  if (updates.openingHours) user.openingHours = updates.openingHours;
  if (updates.services) user.services = updates.services;
  if (updates.languages) user.languages = updates.languages;
  if (updates.acceptedPayments)
    user.acceptedPayments = updates.acceptedPayments;

  // Existing avatar upload
  if (req.file) {
    const upload = await uploadOnCloudinary(req.file.buffer);
    user.avatar = { public_id: upload.public_id, url: upload.secure_url };
  }

  // New: shopLogo (single)
  if (req.files?.shopLogo) {
    const upload = await uploadOnCloudinary(req.files.shopLogo[0].buffer);
    user.shopLogo = { public_id: upload.public_id, url: upload.secure_url };
  }

  // New: portfolioImages (multi, append/limit 10)
  if (req.files?.portfolioImages) {
    const uploads = await Promise.all(
      req.files.portfolioImages
        .slice(0, 10)
        .map((file) => uploadOnCloudinary(file.buffer))
    );
    const newImages = uploads.map((upload, i) => ({
      public_id: upload.public_id,
      url: upload.secure_url,
      description: updates.portfolioDescriptions?.[i] || "",
    }));
    user.portfolioImages = [...user.portfolioImages, ...newImages].slice(-10);
  }

  await user.save();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Profile updated",
    data: user,
  });
});

export const changePassword = catchAsync(async (req, res) => {
  const { currentPassword, newPassword, confirmPassword } = req.body;

  if (newPassword !== confirmPassword)
    throw new AppError(httpStatus.BAD_REQUEST, "Passwords don't match");

  const user = await User.findById(req.user._id).select("+password");

  if (!(await User.isPasswordMatched(currentPassword, user.password))) {
    throw new AppError(httpStatus.UNAUTHORIZED, "Current password wrong");
  }
  user.password = newPassword;

  await user.save();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Password changed",
  });
});

export const deleteAccount = catchAsync(async (req, res) => {
  const { reason, otherReason } = req.body;
  if (!reason) throw new AppError(httpStatus.BAD_REQUEST, "Reason required");

  const user = await User.findById(req.user._id);
  user.deleteReason = reason + (otherReason ? `: ${otherReason}` : "");

  // Cascade delete related data
  await Campaign.deleteMany({ berber: req.user._id });
  await Participation.deleteMany({ user: req.user._id });
  await Vote.deleteMany({ user: req.user._id });

  await user.deleteOne();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Account deleted",
  });
});

export const updateSettings = catchAsync(async (req, res) => {
  const {
    showNotifications,
    emailNewsUpdates,
    emailBirthdayGifts,
    dataPrivacyConsent,
  } = req.body;
  const user = await User.findById(req.user._id);

  if (showNotifications !== undefined)
    user.showNotifications = showNotifications;
  if (emailNewsUpdates !== undefined) user.emailNewsUpdates = emailNewsUpdates;
  if (emailBirthdayGifts !== undefined)
    user.emailBirthdayGifts = emailBirthdayGifts;
  if (dataPrivacyConsent !== undefined)
    user.dataPrivacyConsent = dataPrivacyConsent;

  await user.save();
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Settings updated",
    data: user,
  });
});

export const searchBerbers = catchAsync(async (req, res) => {
  const {
    search,
    sortBy = "distance",
    distance = 50,
    languages,
    openNow,
    payments,
    minRating = 0,
    userLat,
    userLng,
  } = req.query;

  // Base match
  let baseFilter = { role: "berber", profileCompletion: { $gte: 80 } };

  // Build aggregation pipeline
  let pipeline = [];

  // Geo near
  let useGeo = false;
  if (userLat && userLng) {
    useGeo = true;
    const userPoint = {
      type: "Point",
      coordinates: [parseFloat(userLng), parseFloat(userLat)],
    };
    pipeline.push({
      $geoNear: {
        near: userPoint,
        distanceField: "calcDistance",
        distanceMultiplier: 0.001,
        maxDistance: parseFloat(distance) * 1000,
        spherical: true,
        key: "address.location",
      },
    });
  }

  // Text search
  if (search) {
    pipeline.push({
      $match: {
        $or: [
          { name: { $regex: search, $options: "i" } },
          { shopName: { $regex: search, $options: "i" } },
        ],
      },
    });
  }

  // Other filters
  if (languages) {
    pipeline.push({ $match: { languages: { $in: languages.split(",") } } });
  }
  if (payments) {
    pipeline.push({
      $match: { acceptedPayments: { $in: payments.split(",") } },
    });
  }
  if (minRating) {
    // Will merge avgRating later
  }

  // Open now
  const now = new Date();
  now.setFullYear(2025, 11, 4);
  const currentTime = now.toTimeString().slice(0, 5);
  const dayIndex = now.getDay();
  const day = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ][dayIndex];
  if (openNow === "true") {
    pipeline.push({
      $match: {
        openingHours: {
          $elemMatch: {
            day,
            open: { $lte: currentTime },
            close: { $gte: currentTime },
            isClosed: { $ne: true },
          },
        },
      },
    });
  }

  // Base match after geo
  pipeline.unshift({ $match: baseFilter });

  // Sort
  let sortStage = {};
  if (sortBy === "distance" && useGeo) {
    sortStage.calcDistance = 1;
  } else if (sortBy === "rating") {
    sortStage.avgRating = 1;
  }
  pipeline.push({ $sort: sortStage });

  pipeline.push({ $limit: 20 });

  const berbers = await User.aggregate(pipeline);

  // Merge avgRating from Reviews
  const berberIds = berbers.map((b) => b._id);
  const avgRatings = await Review.aggregate([
    { $match: { berber: { $in: berberIds } } },
    { $group: { _id: "$berber", avgRating: { $avg: "$rating" } } },
    {
      $project: {
        _id: 0,
        berber: "$_id",
        avgRating: { $round: ["$avgRating", 1] },
      },
    },
  ]);
  const ratingMap = new Map(
    avgRatings.map((r) => [r.berber.toString(), r.avgRating])
  );

  // Final results with distance (if geo) and rating
  const results = berbers.map((b) => ({
    ...b,
    avgRating: ratingMap.get(b._id.toString()) || 0,
    distance: useGeo ? Math.round(b.calcDistance) : null,
  }));

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Berbers fetched",
    data: results,
  });
});
// Reservations
export const createReservation = catchAsync(async (req, res) => {
  const { berberId, serviceName, date, time } = req.body;
  const berber = await User.findById(berberId);
  if (!berber || berber.role !== "berber")
    throw new AppError(httpStatus.NOT_FOUND, "Berber not found");

  // Query existing at date/time
  const existing = await Reservation.findOne({
    berber: berberId,
    date: new Date(date),
    time,
  });
  if (existing) throw new AppError(httpStatus.CONFLICT, "Slot booked");

  const reservation = await Reservation.create({
    user: req.user._id,
    berber: berberId,
    serviceName,
    date: new Date(date),
    time,
  });

  await reservation.populate(["user", "berber"], "name shopName avatar");
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Reservation created",
    data: reservation,
  });
});

export const updateReservation = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { date, time } = req.body;
  const reservation = await Reservation.findOne({
    _id: id,
    user: req.user._id,
  });
  if (!reservation)
    throw new AppError(httpStatus.NOT_FOUND, "Reservation not found");

  // Check new availability
  const existing = await Reservation.findOne({
    _id: { $ne: id },
    berber: reservation.berber,
    date: new Date(date),
    time,
  });
  if (existing) throw new AppError(httpStatus.CONFLICT, "New slot booked");

  reservation.date = new Date(date);
  reservation.time = time;
  await reservation.save();

  await reservation.populate(["user", "berber"]);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Reservation updated",
    data: reservation,
  });
});

export const deleteReservation = catchAsync(async (req, res) => {
  const { id } = req.params;
  const reservation = await Reservation.findOneAndUpdate(
    { _id: id, user: req.user._id },
    { status: "cancelled" },
    { new: true }
  );
  if (!reservation)
    throw new AppError(httpStatus.NOT_FOUND, "Reservation not found");

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Reservation cancelled",
  });
});

export const getMyReservations = catchAsync(async (req, res) => {
  const { status } = req.query; // "all", "pending", "confirmed"
  const filter = { user: req.user._id };
  if (status && status !== "all") filter.status = status;

  const reservations = await Reservation.find(filter)
    .populate(["berber", "user"], "name shopName avatar")
    .sort({ date: -1 });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Reservations fetched",
    data: reservations,
  });
});

// Reviews
export const addReview = catchAsync(async (req, res) => {
  const { berberId, rating, text } = req.body;
  const berber = await User.findById(berberId);
  if (!berber || berber.role !== "berber")
    throw new AppError(httpStatus.NOT_FOUND, "Berber not found");

  // Link to recent reservation
  const recentRes = await Reservation.findOne({
    user: req.user._id,
    berber: berberId,
    status: "confirmed",
  }).sort({ date: -1 });

  const review = await Review.create({
    berber: berberId,
    user: req.user._id,
    rating,
    text,
    reservation: recentRes?._id,
  });

  await review.populate(["user", "berber"], "name avatar");
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Review added",
    data: review,
  });
});

export const getReviews = catchAsync(async (req, res) => {
  const { berberId } = req.params;
  const reviews = await Review.find({ berber: berberId })
    .populate("user", "name avatar")
    .sort({ createdAt: -1 });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Reviews fetched",
    data: reviews,
  });
});

// Contests (reuse, add to user)
export const getCurrentContest = catchAsync(async (req, res) => {
  // Same as berber
  const contest = await Contest.findOne({ isActive: true })
    .populate({
      path: "participants",
      populate: { path: "user", select: "name avatar role" },
    })
    .sort({ votes: -1 });
  if (!contest) throw new AppError(httpStatus.NOT_FOUND, "No active contest");
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Current contest fetched",
    data: contest,
  });
});
