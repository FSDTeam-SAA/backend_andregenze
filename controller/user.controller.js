import httpStatus from "http-status";
import { User } from "../model/user.model.js";
import { uploadOnCloudinary } from "../utils/commonMethod.js";
import AppError from "../errors/AppError.js";
import sendResponse from "../utils/sendResponse.js";
import catchAsync from "../utils/catchAsync.js";
import { Contest } from "../model/contest.model.js";
import { Review } from "../model/review.model.js";
import { Reservation } from "../model/reservation.model.js";
import { Participation } from "../model/participation.model.js";

const DEFAULT_TZ = "Asia/Dhaka";

// helper: get day + minutes now; allow overrides for testing
const getDayAndMinutesNow = (req) => {
  // override for testing:
  // /search?openNow=true&day=monday&at=12:00
  const forcedDay = req.query.day?.toString().toLowerCase();
  const forcedAt = req.query.at?.toString();

  if (forcedDay && forcedAt && forcedAt.includes(":")) {
    const [h, m] = forcedAt.split(":").map((x) => parseInt(x, 10));
    if (!Number.isNaN(h) && !Number.isNaN(m)) {
      return {
        day: forcedDay,
        minutesNow: h * 60 + m,
        debug: { forcedDay, forcedAt },
      };
    }
  }

  const tz = (req.query.tz || DEFAULT_TZ).toString();
  const now = new Date();

  // Try timezone-aware calculation (may fail if Intl/tzdata not available)
  try {
    const day = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      weekday: "long",
    })
      .format(now)
      .toLowerCase();

    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hour: "numeric",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(now);

    const hh = parseInt(parts.find((p) => p.type === "hour")?.value ?? "0", 10);
    const mm = parseInt(
      parts.find((p) => p.type === "minute")?.value ?? "0",
      10
    );

    return { day, minutesNow: hh * 60 + mm, debug: { tzUsed: tz } };
  } catch (e) {
    // Fallback: server local time (still lets it work)
    const day = [
      "sunday",
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
    ][now.getDay()];
    const minutesNow = now.getHours() * 60 + now.getMinutes();
    return {
      day,
      minutesNow,
      debug: { tzFailed: tz, fallback: "server_local_time" },
    };
  }
};

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
  if (updates.address2) user.address2 = updates.address2;
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
  if (req.files?.avatar) {
    const upload = await uploadOnCloudinary(req.files.avatar[0].buffer);
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
  const search = req.query.search?.trim();
  const sortBy = (req.query.sortBy || "distance").trim();
  const distanceKm = Number(req.query.distance || 50);

  const languagesRaw = req.query.languages; // "Bangla,English"
  const paymentsRaw = req.query.payments || req.query.acceptedPayments; // "cash,bank_card"

  const openNow = req.query.openNow === "true";

  const userLat = req.query.userLat || req.query.lat;
  const userLng = req.query.userLng || req.query.lng;

  const baseFilter = { role: "berber" };

  const hasFilters =
    Boolean(search) ||
    Boolean(languagesRaw) ||
    Boolean(paymentsRaw) ||
    openNow ||
    Boolean(userLat && userLng) ||
    "distance" in req.query ||
    "sortBy" in req.query;

  if (!hasFilters) {
    const berbers = await User.find(baseFilter).limit(20).lean();

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
    const results = berbers.map((b) => ({
      ...b,
      avgRating: ratingMap.get(b._id.toString()) || 0,
      distance: null,
    }));

    return sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "All berbers fetched",
      data: results,
    });
  }

  const pipeline = [];
  const useGeo = Boolean(userLat && userLng);

  if (useGeo) {
    pipeline.push({
      $geoNear: {
        near: {
          type: "Point",
          coordinates: [parseFloat(userLng), parseFloat(userLat)],
        },
        distanceField: "calcDistance",
        distanceMultiplier: 0.001,
        maxDistance: Number.isFinite(distanceKm) ? distanceKm * 1000 : 50000,
        spherical: true,
        key: "address.location",
        query: baseFilter,
      },
    });
  } else {
    pipeline.push({ $match: baseFilter });
  }

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

  if (languagesRaw) {
    const langs = languagesRaw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (langs.length) pipeline.push({ $match: { languages: { $in: langs } } });
  }

  if (paymentsRaw) {
    const pays = paymentsRaw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (pays.length)
      pipeline.push({ $match: { acceptedPayments: { $in: pays } } });
  }

  // ---- openNow filter (safe for "9:00" and "10:00") ----
  let openNowDebug = null;

  if (openNow) {
    const { day, minutesNow, debug } = getDayAndMinutesNow(req);
    openNowDebug = { day, minutesNow, ...debug };

    pipeline.push({
      $addFields: {
        _todayHours: {
          $first: {
            $filter: {
              input: "$openingHours",
              as: "oh",
              cond: { $eq: ["$$oh.day", day] },
            },
          },
        },
      },
    });

    pipeline.push({
      $addFields: {
        _openParts: { $split: [{ $ifNull: ["$_todayHours.open", ""] }, ":"] },
        _closeParts: { $split: [{ $ifNull: ["$_todayHours.close", ""] }, ":"] },
        _isClosed: { $ifNull: ["$_todayHours.isClosed", true] },
      },
    });

    pipeline.push({
      $addFields: {
        _openH: {
          $convert: {
            input: { $arrayElemAt: ["$_openParts", 0] },
            to: "int",
            onError: null,
            onNull: null,
          },
        },
        _openM: {
          $convert: {
            input: { $arrayElemAt: ["$_openParts", 1] },
            to: "int",
            onError: null,
            onNull: null,
          },
        },
        _closeH: {
          $convert: {
            input: { $arrayElemAt: ["$_closeParts", 0] },
            to: "int",
            onError: null,
            onNull: null,
          },
        },
        _closeM: {
          $convert: {
            input: { $arrayElemAt: ["$_closeParts", 1] },
            to: "int",
            onError: null,
            onNull: null,
          },
        },
      },
    });

    pipeline.push({
      $addFields: {
        _openMin: {
          $cond: [
            { $and: [{ $ne: ["$_openH", null] }, { $ne: ["$_openM", null] }] },
            { $add: [{ $multiply: ["$_openH", 60] }, "$_openM"] },
            null,
          ],
        },
        _closeMin: {
          $cond: [
            {
              $and: [{ $ne: ["$_closeH", null] }, { $ne: ["$_closeM", null] }],
            },
            { $add: [{ $multiply: ["$_closeH", 60] }, "$_closeM"] },
            null,
          ],
        },
      },
    });

    pipeline.push({
      $match: {
        $expr: {
          $and: [
            { $ne: ["$_todayHours", null] },
            { $ne: ["$_isClosed", true] },
            { $ne: ["$_openMin", null] },
            { $ne: ["$_closeMin", null] },
            {
              $cond: [
                { $gte: ["$_closeMin", "$_openMin"] },
                {
                  $and: [
                    { $lte: ["$_openMin", minutesNow] },
                    { $gte: ["$_closeMin", minutesNow] },
                  ],
                },
                {
                  $or: [
                    { $gte: [minutesNow, "$_openMin"] },
                    { $lte: [minutesNow, "$_closeMin"] },
                  ],
                },
              ],
            },
          ],
        },
      },
    });

    pipeline.push({
      $project: {
        _todayHours: 0,
        _openParts: 0,
        _closeParts: 0,
        _openH: 0,
        _openM: 0,
        _closeH: 0,
        _closeM: 0,
        _openMin: 0,
        _closeMin: 0,
        _isClosed: 0,
      },
    });
  }

  const sortStage = {};
  if (sortBy === "distance" && useGeo) sortStage.calcDistance = 1;
  else sortStage.createdAt = -1;

  pipeline.push({ $sort: sortStage }, { $limit: 20 });

  const berbers = await User.aggregate(pipeline);

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

  const results = berbers.map((b) => ({
    ...b,
    avgRating: ratingMap.get(b._id.toString()) || 0,
    distance: useGeo ? Math.round(b.calcDistance) : null,
  }));

  return sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Berbers fetched",
    data: results,
    // optional debug so you can see what's happening (remove later)
    debug: openNow ? { openNowDebug } : undefined,
  });
});

export const getBerber = catchAsync(async (req, res) => {
  const { id } = req.params;
  const berber = await User.findById(id);
  if (!berber) throw new AppError(httpStatus.NOT_FOUND, "Berber not found");

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Berber fetched",
    data: berber,
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

  await reservation.populate(["user", "berber"], "name shopName avatar");
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

// Contest Controllers
export const getCurrentContest = catchAsync(async (req, res) => {
  const userId = req.user?._id;

  const contest = await Contest.findOne({ isActive: true }).populate({
    path: "participants",
    populate: {
      path: "user",
      select: "name avatar",
    },
    options: { sort: { votes: -1 } },
  });

  if (!contest) {
    throw new AppError(httpStatus.NOT_FOUND, "No active contest");
  }

  let myParticipation = null;

  if (userId) {
    myParticipation = await Participation.findOne({
      contest: contest._id,
      user: userId,
    }).populate("user", "name avatar");
  }

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Current contest fetched",
    data: {
      contest,
      myParticipation,
    },
  });
});
