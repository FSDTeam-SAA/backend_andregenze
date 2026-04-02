import mongoose from "mongoose";
import AppError from "../errors/AppError.js";
import { loyalty } from "../model/loylalityPoint.model.js";
import { Campaign } from "../model/campaign.model.js";
import catchAsync from "../utils/catchAsync.js";
import sendResponse from "../utils/sendResponse.js";

const SHOP_SELECT = "shopName name email avatar shopLogo role";
const USER_SELECT = "name email avatar";
const CAMPAIGN_SELECT = "berber name discount type startDate endDate";

// const getCampaignState = (campaign) => {
//   if (!campaign) return null;

//   const now = new Date();
//   const start = campaign.startDate ? new Date(campaign.startDate) : null;
//   const end = campaign.endDate ? new Date(campaign.endDate) : null;

//   if (start && now < start) return "upcoming";
//   if (end && now > end) return "ended";
//   return "active";
// };

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

  if (!userId ) {
    throw new AppError(400, "userId  are required");
  }


  const activeCampaign = await Campaign.findOne({
    berber: req.user._id,
    $or: [
      {
        startDate: { $lte: new Date(endDate) },
        endDate: { $gte: new Date(startDate) },
      },
    ],
  });
  if (!activeCampaign) {
    throw new AppError(404, "Active campaign not found for this shop");
  }

  // const campaignState = getCampaignState(activeCampaign._id);
  // if (campaignState !== "active") {
  //   throw new AppError(400, "Campaign is not active");
  // }

  const doc = await loyalty.findOneAndUpdate(
    { shopId, userId, campaignId: activeCampaign._id },
    { $inc: { visitCount: 1 }, $set: { campaignState } },
    { new: true, upsert: true },
  );

  if (doc.visitCount > 10) {
    await loyalty.updateOne(
      { _id: doc._id },
      {
        $inc: { totalGiftPoints: 1 },
        $set: { visitCount: 0 },
      },
    );
  }

  const updatedDoc = await loyalty
    .findById(doc._id)
    .populate("shopId", SHOP_SELECT)
    .populate("userId", USER_SELECT)
    .populate("campaignId", CAMPAIGN_SELECT);

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

  const query = {
    userId: req.user._id,
    shopId: new mongoose.Types.ObjectId(shopId),
  };
  if (campaignId) query.campaignId = campaignId;

  const result = await loyalty
    .findOne(query)
    .populate("shopId", SHOP_SELECT)
    .populate("userId", USER_SELECT)
    .populate("campaignId", CAMPAIGN_SELECT);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Loyalty fetched successfully",
    data: formatLoyalty(result),
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
