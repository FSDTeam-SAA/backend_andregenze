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
    shopName,
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

  if (!Array.isArray(services) || services.length === 0) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Required field missing: services",
    );
  }

  if (!Array.isArray(openingHours) || openingHours.length === 0) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Required field missing: openingHours",
    );
  }

  if (!Array.isArray(languages) || languages.length === 0) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Required field missing: languages",
    );
  }

  if (!user.address) {
    user.address = {};
  }

  user.shopDescription = shopDescription || "";

  user.socialMedia =
    socialMedia &&
    typeof socialMedia === "object" &&
    !Array.isArray(socialMedia)
      ? socialMedia
      : {};

  user.shopName = shopName || "";
  user.staffMembers = Array.isArray(staffMembers) ? staffMembers : [];
  user.openingHours = openingHours;
  user.services = services;
  user.languages = languages;
  user.acceptedPayments = Array.isArray(acceptedPayments)
    ? acceptedPayments
    : [];

  if (address && typeof address === "object" && !Array.isArray(address)) {
    const { location, ...safeAddress } = address;
    Object.assign(user.address, safeAddress);
  }

  const latNum = Number(lat);
  const lngNum = Number(lng);

  if (Number.isFinite(latNum) && Number.isFinite(lngNum)) {
    user.address.location = {
      type: "Point",
      coordinates: [lngNum, latNum],
    };
  } else {
    user.address.location = null;
  }

  if (!req.files?.shopLogo?.[0]) {
    throw new AppError(httpStatus.BAD_REQUEST, "Shop logo required");
  }

  const logoUpload = await uploadOnCloudinary(req.files.shopLogo[0].buffer);
  user.shopLogo = {
    public_id: logoUpload.public_id,
    url: logoUpload.secure_url,
  };

  const descArr = Array.isArray(portfolioDescriptions)
    ? portfolioDescriptions
    : [];
  let portfolioImages = [];

  if (req.files?.portfolioImages?.length) {
    const uploads = await Promise.all(
      req.files.portfolioImages
        .slice(0, 10)
        .map((file) => uploadOnCloudinary(file.buffer)),
    );

    portfolioImages = uploads.map((upload, i) => ({
      public_id: upload.public_id,
      url: upload.secure_url,
      description: descArr[i] || "",
    }));
  }

  user.portfolioImages = portfolioImages;

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

export const updateBerberProfile = catchAsync(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user) throw new AppError(httpStatus.NOT_FOUND, "User not found");

  if (user.role !== "berber") {
    throw new AppError(httpStatus.FORBIDDEN, "Berber update only");
  }

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
    shopName,
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
    phone,
  } = req.body;

  if (shopDescription !== undefined) user.shopDescription = shopDescription;

  if (
    socialMedia &&
    typeof socialMedia === "object" &&
    !Array.isArray(socialMedia)
  )
    user.socialMedia = socialMedia;

  if (Array.isArray(shopName)) user.shopName = shopName;

  if (Array.isArray(staffMembers)) user.staffMembers = staffMembers;

  if (Array.isArray(phone)) user.phone = phone;

  if (Array.isArray(openingHours)) user.openingHours = openingHours;

  if (Array.isArray(services)) user.services = services;

  if (Array.isArray(languages)) user.languages = languages;

  if (Array.isArray(acceptedPayments)) user.acceptedPayments = acceptedPayments;

  if (!user.address) user.address = {};

  if (address && typeof address === "object" && !Array.isArray(address)) {
    const { location, ...safeAddress } = address;
    Object.assign(user.address, safeAddress);
  }

  const latNum = Number(lat);
  const lngNum = Number(lng);

  if (Number.isFinite(latNum) && Number.isFinite(lngNum)) {
    user.address.location = {
      type: "Point",
      coordinates: [lngNum, latNum],
    };
  }

  if (req.files?.shopLogo?.[0]) {
    const logoUpload = await uploadOnCloudinary(req.files.shopLogo[0].buffer);
    user.shopLogo = {
      public_id: logoUpload.public_id,
      url: logoUpload.secure_url,
    };
  }

  if (req.files?.portfolioImages?.length) {
    const descArr = Array.isArray(portfolioDescriptions)
      ? portfolioDescriptions
      : [];

    const uploads = await Promise.all(
      req.files.portfolioImages
        .slice(0, 10)
        .map((file) => uploadOnCloudinary(file.buffer)),
    );

    user.portfolioImages = uploads.map((upload, i) => ({
      public_id: upload.public_id,
      url: upload.secure_url,
      description: descArr[i] || "",
    }));
  }

  await user.save();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Berber profile updated successfully",
    data: user.toObject(),
  });
});

export const getMyReservationsAsBerber = catchAsync(async (req, res) => {
  const { date } = req.query;

  // Base query (always applied)
  const query = {
    berber: req.user._id,
  };

  // Apply date filter ONLY if date is provided
  if (date) {
    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);

    query.date = {
      $gte: startDate,
      $lte: endDate,
    };
  }

  const reservations = await Reservation.find(query)
    .populate("user", "name phone avatar")
    .sort({ date: 1 });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: date ? "Reservations fetched by date" : "All reservations fetched",
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

  await reservation.populate(["user", "berber"], "name shopName avatar");
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

  const activeCampaign = await Campaign.findOne({
    berber: req.user._id,
    $or: [
      {
        startDate: { $lte: new Date(endDate) },
        endDate: { $gte: new Date(startDate) },
      },
    ],
  });

  if (activeCampaign)
    throw new AppError(httpStatus.BAD_REQUEST, "Already running a campaign");

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

export const updateCampaign = catchAsync(async (req, res) => {
  const { id } = req.params;
  const campaign = await Campaign.findOne({ _id: id, berber: req.user._id });
  if (!campaign) throw new AppError(httpStatus.NOT_FOUND, "Campaign not found");

  const { name, discount, type, startDate, endDate } = req.body;
  campaign.name = name;
  campaign.discount = discount;
  campaign.type = type;
  campaign.startDate = new Date(startDate);
  campaign.endDate = new Date(endDate);
  await campaign.save();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Campaign updated",
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
        100,
    ) || 0;
  campaign.stats.currentMembers = campaign.members.length;

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Stats fetched",
    data: campaign.stats,
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

export const getHallOfFame = catchAsync(async (req, res) => {
  const { type } = req.query;
  const now = new Date();

  const contestSelect = "_id title startDate endDate";

  // ---------- CURRENT ----------
  if (type === "current") {
    const contests = await Contest.find({
      startDate: { $lte: now },
      endDate: { $gte: now },
    })
      .sort({ startDate: -1 })
      .select(contestSelect)
      .lean();

    const data = await Promise.all(
      contests.map(async (contest) => {
        const participants = await Participation.find({ contest: contest._id })
          .sort({ votes: -1, submittedAt: 1 })
          .populate("user", "name avatar")
          .select("photo votes submittedAt description frame user")
          .lean();

        return {
          contest,
          participants,
        };
      }),
    );

    return sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Hall of Fame fetched",
      data,
    });
  }

  // ---------- PREVIOUS ----------
  const contests = await Contest.find({ endDate: { $lt: now } })
    .sort({ startDate: -1 })
    .select(contestSelect)
    .lean();

  const data = await Promise.all(
    contests.map(async (contest) => {
      const winner = await Participation.findOne({ contest: contest._id })
        .sort({ votes: -1, submittedAt: 1 })
        .populate("user", "name avatar")
        .select("photo votes submittedAt description frame user") // includes votes ✅
        .lean();

      return {
        contest,
        winner: winner || null,
      };
    }),
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Hall of Fame fetched",
    data,
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
  await Contest.updateOne(
    { _id: participation.contest },
    { $pull: { participants: participation._id } },
  );
  await participation.deleteOne();

  await participation.deleteOne();
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Participation deleted",
  });
});

export const voteForParticipation = catchAsync(async (req, res) => {
  const { participationId } = req.params;
  const userId = req.user._id;

  const existingVote = await Vote.findOne({
    user: userId,
    participation: participationId,
  });

  if (existingVote) {
    await Vote.findByIdAndDelete(existingVote._id);

    await Participation.findByIdAndUpdate(participationId, {
      $inc: { votes: -1 },
    });

    return sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Vote removed",
      data: { voted: false },
    });
  }

  await Vote.create({
    user: userId,
    participation: participationId,
  });

  await Participation.findByIdAndUpdate(participationId, {
    $inc: { votes: 1 },
  });

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Vote added",
    data: { voted: true },
  });
});

export const deleteContestParticipation = catchAsync(async (req, res) => {
  const { contestId, participationId } = req.params;
  const now = new Date();

  const contest = await Contest.findById(contestId);

  if (!contest) {
    return sendResponse(res, {
      statusCode: httpStatus.NOT_FOUND,
      success: false,
      message: "Contest not found",
    });
  }

  const participation = await Participation.findOne({
    _id: participationId,
    contest: contestId,
  });

  if (!participation) {
    return sendResponse(res, {
      statusCode: httpStatus.NOT_FOUND,
      success: false,
      message: "Participation not found",
    });
  }

  // CURRENT CONTEST
  if (contest.startDate <= now && contest.endDate >= now) {
    await participation.deleteOne();

    return sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Participant deleted from current contest",
    });
  }

  // PREVIOUS CONTEST
  if (contest.endDate < now) {
    const winner = await Participation.findOne({ contest: contestId }).sort({
      votes: -1,
      submittedAt: 1,
    });

    if (!winner || winner._id.toString() !== participationId) {
      return sendResponse(res, {
        statusCode: httpStatus.BAD_REQUEST,
        success: false,
        message: "Only the winner can be deleted from previous contests",
      });
    }

    await participation.deleteOne();

    return sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Winner deleted from previous contest",
    });
  }

  // UPCOMING CONTEST
  return sendResponse(res, {
    statusCode: httpStatus.BAD_REQUEST,
    success: false,
    message: "Cannot delete participation from upcoming contest",
  });
});

export const getHallOfFameWeb = catchAsync(async (req, res) => {
  const { type = "current" } = req.query;
  const now = new Date();

  const contestSelect = "title startDate endDate";

  // ================= CURRENT =================
  if (type === "current") {
    const contests = await Contest.find({
      startDate: { $lte: now },
      endDate: { $gte: now },
    })
      .select(contestSelect)
      .populate({
        path: "participants",
        options: { sort: { votes: -1, submittedAt: 1 } },
        select: "photo votes submittedAt description frame",
        populate: {
          path: "user",
          select: "name avatar",
        },
      })
      .sort({ startDate: -1 })
      .lean();

    // 🔥 SHAPE FIX (THIS IS THE KEY PART)
    const data = contests.map((contest) => ({
      contest: {
        _id: contest._id,
        title: contest.title,
        startDate: contest.startDate,
        endDate: contest.endDate,
      },
      participants: contest.participants || [],
    }));

    return sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Hall of Fame fetched",
      data,
    });
  }

  // ================= PREVIOUS =================
  const contests = await Contest.find({
    endDate: { $lt: now },
  })
    .select(contestSelect)
    .populate({
      path: "winners",
      options: { sort: { votes: -1, submittedAt: 1 }, limit: 1 },
      select: "photo votes submittedAt description frame",
      populate: {
        path: "user",
        select: "name avatar",
      },
    })
    .sort({ startDate: -1 })
    .lean();

  const data = contests.map((contest) => ({
    contest: {
      _id: contest._id,
      title: contest.title,
      startDate: contest.startDate,
      endDate: contest.endDate,
    },
    winner: contest.winners?.[0] || null,
  }));

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Hall of Fame fetched",
    data,
  });
});

export const addStuff = catchAsync(async (req, res) => {
  const { userIds } = req.body;
  const user = await User.findById(req.user._id);
  if (user.role !== "user") {
    throw new AppError(httpStatus.FORBIDDEN, "Users only");
  }
  const staffMembers = user.staffMembers || [];
  userIds.forEach((id) => {
    if (!staffMembers.includes(id)) {
      staffMembers.push(id);
    }
  });
  user.staffMembers = staffMembers;
  await user.save();
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Staff members added successfully",
    data: user.staffMembers,
  });
});

export const deleteStuff = catchAsync(async (req, res) => {
  const { userId } = req.body;
  const user = await User.findById(req.user._id);
  if (user.role !== "berber") {
    throw new AppError(httpStatus.FORBIDDEN, "Berber only");
  }
  const staffMembers = user.staffMembers || [];
  if (staffMembers.includes(userId)) {
    staffMembers.splice(staffMembers.indexOf(userId), 1);
  }
  user.staffMembers = staffMembers;
  await user.save();
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Staff members delete successfully",
    data: user.staffMembers,
  });
});
