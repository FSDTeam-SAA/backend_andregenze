import AppError from "../errors/AppError.js";
import { Campaign } from "../model/campaign.model.js";
import { Contest } from "../model/contest.model.js";
import { Participation } from "../model/participation.model.js";
import { Reservation } from "../model/reservation.model.js";
import { User } from "../model/user.model.js";
import { Vote } from "../model/vote.model.js";
import catchAsync from "../utils/catchAsync.js";
import { uploadOnCloudinary } from "../utils/commonMethod.js";
import sendResponse from "../utils/sendResponse.js";
import httpStatus from "http-status";

export const setupBerberProfile = catchAsync(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user) throw new AppError(httpStatus.NOT_FOUND, "User not found");

  if (user.role !== "berber") {
    throw new AppError(httpStatus.FORBIDDEN, "Berber setup only");
  }

  if (user.profileCompletion > 0) {
    throw new AppError(httpStatus.BAD_REQUEST, "Profile already set up");
  }

  // ✅ Parse JSON fields
  const parseIfJson = (v) => {
    if (typeof v !== "string") return v;
    try {
      return JSON.parse(v);
    } catch {
      return v;
    }
  };

  const jsonFields = [
    "socialMedia",
    "staffMembers",
    "openingHours",
    "services",
    "languages",
    "acceptedPayments",
    "portfolioDescriptions",
    "address",
  ];

  jsonFields.forEach((k) => {
    if (req.body?.[k] != null) req.body[k] = parseIfJson(req.body[k]);
  });

  const {
    shopDescription,
    socialMedia,
    staffMembers,
    openingHours,
    services,
    languages,
    acceptedPayments,
    portfolioDescriptions,
    lat,
    lng,
    address,
  } = req.body;

  // ✅ Validations
  if (!Array.isArray(services) || services.length === 0) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Required field missing: services"
    );
  }

  if (!Array.isArray(openingHours) || openingHours.length === 0) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Required field missing: openingHours"
    );
  }

  if (!Array.isArray(languages) || languages.length === 0) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Required field missing: languages"
    );
  }

  // ✅ Initialize user.address if it doesn't exist
  if (!user.address) {
    user.address = {};
  }

  // ✅ Assign fields
  user.shopDescription = shopDescription || "";

  user.socialMedia =
    socialMedia &&
    typeof socialMedia === "object" &&
    !Array.isArray(socialMedia)
      ? socialMedia
      : {};

  user.staffMembers = Array.isArray(staffMembers) ? staffMembers : [];
  user.openingHours = openingHours;
  user.services = services;
  user.languages = languages;
  user.acceptedPayments = Array.isArray(acceptedPayments)
    ? acceptedPayments
    : [];

  // ✅ Address handling
  if (address && typeof address === "object" && !Array.isArray(address)) {
    const { location, ...safeAddress } = address; // ✅ drop location completely
    Object.assign(user.address, safeAddress);
  }

  // ✅ Handle geo location
  const latNum = Number(lat);
  const lngNum = Number(lng);

  if (Number.isFinite(latNum) && Number.isFinite(lngNum)) {
    user.address.location = {
      type: "Point",
      coordinates: [lngNum, latNum],
    };
  } else {
    // ✅ If no valid lat/lng, remove location field entirely
    user.address.location = null;
  }

  // ✅ Upload shop logo
  if (!req.files?.shopLogo?.[0]) {
    throw new AppError(httpStatus.BAD_REQUEST, "Shop logo required");
  }

  const logoUpload = await uploadOnCloudinary(req.files.shopLogo[0].buffer);
  user.shopLogo = {
    public_id: logoUpload.public_id,
    url: logoUpload.secure_url,
  };

  // ✅ Portfolio images
  const descArr = Array.isArray(portfolioDescriptions)
    ? portfolioDescriptions
    : [];
  let portfolioImages = [];

  if (req.files?.portfolioImages?.length) {
    const uploads = await Promise.all(
      req.files.portfolioImages
        .slice(0, 10)
        .map((file) => uploadOnCloudinary(file.buffer))
    );

    portfolioImages = uploads.map((upload, i) => ({
      public_id: upload.public_id,
      url: upload.secure_url,
      description: descArr[i] || "",
    }));
  }

  user.portfolioImages = portfolioImages;

  // ✅ Ensure address exists before saving
  if (!user.address) {
    user.address = {};
  }

  await user.save();

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Berber profile set up successfully",
    data: user.toObject(),
  });
});

export const getMyReservationsAsBerber = catchAsync(async (req, res) => {
  const reservations = await Reservation.find({ berber: req.user._id })
    .populate("user", "name phone avatar")
    .sort({ date: 1 });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Incoming reservations fetched",
    data: reservations,
  });
});

// Berber: Accept/confirm reservation
export const confirmReservation = catchAsync(async (req, res) => {
  const { id } = req.params;
  const reservation = await Reservation.findOne({
    _id: id,
    berber: req.user._id,
  });
  if (!reservation)
    throw new AppError(httpStatus.NOT_FOUND, "Reservation not found");

  reservation.status = "confirmed";
  await reservation.save();

  await reservation.populate(["user", "berber"]);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Reservation confirmed",
    data: reservation,
  });
});

// Campaign Controllers
export const createCampaign = catchAsync(async (req, res) => {
  const { name, discount, type, startDate, endDate } = req.body;
  const user = await User.findById(req.user._id);
  if (user.role !== "berber")
    throw new AppError(httpStatus.FORBIDDEN, "Berber only");

  const campaign = await Campaign.create({
    berber: req.user._id,
    name,
    discount,
    type,
    startDate: new Date(startDate),
    endDate: new Date(endDate),
  });

  await campaign.populate("berber", "shopName");
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Campaign created",
    data: campaign,
  });
});

export const getMyCampaigns = catchAsync(async (req, res) => {
  const campaigns = await Campaign.find({ berber: req.user._id })
    .populate("members", "name avatar")
    .sort({ endDate: -1 });
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Campaigns fetched",
    data: campaigns,
  });
});

export const getCampaignStats = catchAsync(async (req, res) => {
  const { id } = req.params;
  const campaign = await Campaign.findOne({ _id: id, berber: req.user._id });
  if (!campaign) throw new AppError(httpStatus.NOT_FOUND, "Campaign not found");

  // Compute successRate if needed (e.g., (redeemed / total) * 100)
  campaign.stats.successRate =
    Math.round(
      (campaign.stats.stampsPerMonth.reduce((sum, m) => sum + m.count, 0) /
        (campaign.totalStamps * campaign.currentMembers)) *
        100
    ) || 0;
  campaign.stats.currentMembers = campaign.members.length;

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Stats fetched",
    data: campaign.stats,
  });
});

// Contest Controllers (Berber view/participate)
export const getCurrentContest = catchAsync(async (req, res) => {
  const contest = await Contest.findOne({ isActive: true })
    .populate({
      path: "participants",
      populate: { path: "user", select: "name avatar" },
    })
    .sort({ votes: -1 }); // Leaderboard
  if (!contest) throw new AppError(httpStatus.NOT_FOUND, "No active contest");

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Current contest fetched",
    data: contest,
  });
});

export const getHallOfFame = catchAsync(async (req, res) => {
  const { type } = req.query; // "current" or "previous"
  let contests;
  if (type === "previous") {
    contests = await Contest.find({ isActive: false }).populate(
      "winners",
      "photo votes submittedAt user"
    );
  } else {
    contests = await Contest.find({ isActive: true }).populate(
      "participants",
      "photo votes submittedAt user"
    );
  }
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Hall of Fame fetched",
    data: contests,
  });
});

export const participateInContest = catchAsync(async (req, res) => {
  const { description, frame } = req.body;
  const contest = await Contest.findOne({ isActive: true });
  if (!contest) throw new AppError(httpStatus.NOT_FOUND, "No active contest");

  // Check existing participation
  let participation = await Participation.findOne({
    user: req.user._id,
    contest: contest._id,
  });
  if (participation)
    throw new AppError(httpStatus.BAD_REQUEST, "Already participating");

  if (req.file) {
    const upload = await uploadOnCloudinary(req.file.buffer);
    participation = await Participation.create({
      contest: contest._id,
      user: req.user._id,
      photo: { public_id: upload.public_id, url: upload.secure_url },
      description,
      frame,
    });
    await contest.updateOne({ $push: { participants: participation._id } });
  }

  await participation.populate("user", "name avatar");
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Participation submitted",
    data: participation,
  });
});

export const updateParticipation = catchAsync(async (req, res) => {
  // Change photo
  const { description, frame } = req.body;
  const participation = await Participation.findOne({
    user: req.user._id,
    contest: { $exists: true },
  });
  if (!participation)
    throw new AppError(httpStatus.NOT_FOUND, "No participation");

  // Reset votes on change
  await Vote.deleteMany({ participation: participation._id });
  participation.votes = 0;

  if (req.file) {
    const upload = await uploadOnCloudinary(req.file.buffer);
    participation.photo = {
      public_id: upload.public_id,
      url: upload.secure_url,
    };
  }
  if (description) participation.description = description;
  if (frame) participation.frame = frame;

  await participation.save();
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Participation updated (votes reset)",
    data: participation,
  });
});

export const deleteParticipation = catchAsync(async (req, res) => {
  const participation = await Participation.findOne({
    user: req.user._id,
    contest: { $exists: true },
  });
  if (!participation)
    throw new AppError(httpStatus.NOT_FOUND, "No participation");

  // Reset votes
  await Vote.deleteMany({ participation: participation._id });

  await participation.deleteOne();
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Participation deleted",
  });
});

export const voteForParticipation = catchAsync(async (req, res) => {
  // Called by users, but in berber flow for view
  const { participationId } = req.params;
  const existingVote = await Vote.findOne({
    user: req.user._id,
    participation: participationId,
  });
  if (existingVote) throw new AppError(httpStatus.BAD_REQUEST, "Already voted");

  const vote = await Vote.create({
    user: req.user._id,
    participation: participationId,
  });
  await Participation.findByIdAndUpdate(participationId, {
    $inc: { votes: 1 },
  });

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Vote cast",
    data: vote,
  });
});
