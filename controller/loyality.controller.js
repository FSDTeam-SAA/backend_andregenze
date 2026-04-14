import mongoose from "mongoose";
import AppError from "../errors/AppError.js";
import { loyalty } from "../model/loylalityPoint.model.js";
import { Campaign } from "../model/campaign.model.js";
import catchAsync from "../utils/catchAsync.js";
import sendResponse from "../utils/sendResponse.js";
import { io } from "../server.js";

const SHOP_SELECT = "shopName name email avatar shopLogo role";
const USER_SELECT = "name email avatar";
const CAMPAIGN_SELECT = "berber name discount type startDate endDate";

const formatLoyalty = (doc) => {
  const row = doc?.toObject ? doc.toObject() : doc;
  if (!row) return row;

  if (row.shopId && typeof row.shopId === "object") {
    row.shopId.displayName = row.shopId.shopName || row.shopId.name || "";
    row.shopId.profilePicture =
      row.shopId.shopLogo?.url || row.shopId.avatar?.url || "";
  }

  if (row.userId && typeof row.userId === "object") {
    row.userId.profilePicture = row.userId.avatar?.url || "";
  }

  row.campaignState = row.campaignState || null;

  return row;
};

export const createLoyalty = catchAsync(async (req, res) => {
  const { userId } = req.body;
  const shopId = req.user._id;

  if (!userId) {
    throw new AppError(400, "userId is required");
  }

  const now = new Date();
  console.log("Finding active campaign for shop:", shopId);
  console.log("Current date:", now);

  const activeCampaign = await Campaign.findOne({
    berber: shopId,
    startDate: { $lte: now },
    endDate: { $gte: now },
  }).sort({ createdAt: -1 });

  console.log("Active campaign found:", activeCampaign);
  if (!activeCampaign) {
    throw new AppError(404, "Active campaign not found for this shop");
  }

  const loyaltyQuery = { shopId, userId, campaignId: activeCampaign._id };
  const existingLoyalty = await loyalty.findOne(loyaltyQuery);

  const doc = existingLoyalty
    ? await loyalty.findOneAndUpdate(
        loyaltyQuery,
        { $inc: { visitCount: 1 }, $set: { campaignState: "active" } },
        { new: true },
      )
    : await loyalty.create({
        ...loyaltyQuery,
        visitCount: 2,
        totalGiftPoints: 0,
        campaignState: "active",
      });

  if (doc.visitCount > 10) {
    await loyalty.updateOne(
      { _id: doc._id },
      {
        $inc: { totalGiftPoints: 1 },
        $set: { visitCount: 1 },
      },
    );
  }

  const updatedDoc = await loyalty
    .findById(doc._id)
    .populate("shopId", SHOP_SELECT)
    .populate("userId", USER_SELECT)
    .populate("campaignId", CAMPAIGN_SELECT);

  io.to(`chat_${userId}`).emit("loyaltyUpdated", formatLoyalty(updatedDoc));

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: "Loyalty created successfully",
    data: formatLoyalty(updatedDoc),
  });
});

export const getAllLoyalties = catchAsync(async (req, res) => {
  const { shopId, userId, campaignId } = req.query;

  const filter = {};
  if (shopId) filter.shopId = shopId;
  if (userId) filter.userId = userId;
  if (campaignId) filter.campaignId = campaignId;

  const docs = await loyalty
    .find(filter)
    .populate("shopId", SHOP_SELECT)
    .populate("userId", USER_SELECT)
    .populate("campaignId", CAMPAIGN_SELECT)
    .sort({ createdAt: -1 });

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Loyalties fetched successfully",
    data: docs.map((doc) => formatLoyalty(doc)),
  });
});

export const getLoyaltyById = catchAsync(async (req, res) => {
  const { id } = req.params;

  const doc = await loyalty
    .findById(id)
    .populate("shopId", SHOP_SELECT)
    .populate("userId", USER_SELECT)
    .populate("campaignId", CAMPAIGN_SELECT);

  if (!doc) throw new AppError(404, "Loyalty not found");

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Loyalty fetched successfully",
    data: formatLoyalty(doc),
  });
});

export const deleteLoyalty = catchAsync(async (req, res) => {
  const { id } = req.params;

  const doc = await loyalty.findByIdAndDelete(id);
  if (!doc) throw new AppError(404, "Loyalty not found");

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: "Loyalty delete successfully",
    data: formatLoyalty(doc),
  });
});

export const getShopWiseLoyaltyCount = catchAsync(async (req, res, next) => {
  const { shopId, campaignId } = req.query;

  if (!shopId) {
    throw new AppError(400, "shopId query is required");
  }

  if (!mongoose.Types.ObjectId.isValid(shopId)) {
    return next(new AppError("Invalid shopId", 400));
  }

  if (campaignId && !mongoose.Types.ObjectId.isValid(campaignId)) {
    return next(new AppError("Invalid campaignId", 400));
  }

  const query = {
    shopId: new mongoose.Types.ObjectId(shopId),
  };
  if (campaignId) query.campaignId = new mongoose.Types.ObjectId(campaignId);

  const result = await loyalty
    .find(query)
    .populate("shopId", SHOP_SELECT)
    .populate("userId", USER_SELECT)
    .populate("campaignId", CAMPAIGN_SELECT)
    .sort({ createdAt: -1 });

  const COIN_TARGET = 10;

  const grouped = new Map();
  result.forEach((doc) => {
    const row = formatLoyalty(doc);
    const userKey = row?.userId?._id?.toString();
    if (!userKey) return;

    if (!grouped.has(userKey)) {
      grouped.set(userKey, {
        userId: row.userId._id,
        userName: row.userId.name || "",
        profilePicture: row.userId.profilePicture || "",
        coinsCollected: 0,
        completedRewardCards: 0,
        campaignState: row.campaignState || null,
      });
    }

    const item = grouped.get(userKey);
    item.coinsCollected += Number(row.visitCount || 0);
    item.completedRewardCards += Number(row.totalGiftPoints || 0);

    if (item.campaignState !== "active" && row.campaignState === "active") {
      item.campaignState = "active";
    }
  });

  const customers = Array.from(grouped.values()).map((item) => ({
    ...item,
    coinsTarget: COIN_TARGET,
    coinsProgress: `${String(item.coinsCollected).padStart(2, "0")} / ${COIN_TARGET}`,
  }));

  const summary = {
    totalCustomers: customers.length,
    totalCoinsCollected: customers.reduce(
      (sum, item) => sum + item.coinsCollected,
      0,
    ),
    totalCompletedRewardCards: customers.reduce(
      (sum, item) => sum + item.completedRewardCards,
      0,
    ),
  };

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Loyalty fetched successfully",
    data: {
      summary,
      customers,
    },
  });
});

export const getUserLoyaltyPointsShopWise = catchAsync(async (req, res, next) => {
  const { userId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return next(new AppError("Invalid userId", 400));
  }

  const uid = new mongoose.Types.ObjectId(userId);

  const loyaltyDocs = await loyalty
    .find({ userId: uid })
    .populate("shopId", SHOP_SELECT)
    .populate("userId", USER_SELECT)
    .populate("campaignId", CAMPAIGN_SELECT);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Loyalty fetched successfully",
    data: loyaltyDocs.map((doc) => formatLoyalty(doc)),
  });
});
