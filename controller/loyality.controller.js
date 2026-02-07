import mongoose from "mongoose";
import AppError from "../errors/AppError.js";
import { loyalty } from "../model/loylalityPoint.model.js";
import catchAsync from "../utils/catchAsync.js";
import sendResponse from "../utils/sendResponse.js";



export const createLoyalty = catchAsync(async (req, res, next) => {
    const { userId } = req.body;
    const shopId = req.user._id; // From auth middleware

    if (!userId) {
        throw new AppError(400, "shopId and userId are required");
    }

    // // Prevent duplicate
    // const exists = await loyalty.findOne({ shopId, userId });
    // if (exists) {
    //     throw new AppError(400, "Loyalty already exists for this shop & user");
    // }

      const doc = await loyalty.findOneAndUpdate(
    { shopId, userId },
    { $inc: { visitCount: 1 } },
    { new: true, upsert: true }
  );

  if (doc.visitCount > 10) {
    await loyalty.updateOne(
      { _id: doc._id },
      {
        $inc: { totalGiftPoints: 1 },
        $set: { visitCount: 0 }, // reset counter
      }
    );
  }
    sendResponse(res, {
        statusCode: 201,
        success: true,
        message: "Loyalty created successfully",
        data: doc,
    })
});

/**
 * Get all loyalties (optionally filter by shopId/userId)
 * query: ?shopId=...&userId=...
 */
export const getAllLoyalties = catchAsync(async (req, res, next) => {
    const { shopId, userId } = req.query;

    const filter = {};
    if (shopId) filter.shopId = shopId;
    if (userId) filter.userId = userId;

    const docs = await loyalty.find(filter)
        .populate("shopId", "name email avatar")
        .populate("userId", "name email avatar")
        .sort({ createdAt: -1 });

    sendResponse(res, {
        statusCode: 201,
        success: true,
        message: "Loyalties fetched successfully",
        data: docs,
    })
});

/**
 * Get single loyalty by id
 */
export const getLoyaltyById = catchAsync(async (req, res, next) => {
    const { id } = req.params;

    const doc = await loyalty.findById(id)
        .populate("shopId", "name email")
        .populate("userId", "name email");

    if (!doc) throw new AppError(404, "Loyalty not found")

    sendResponse(res, {
        statusCode: 200,
        success: true,
        message: "Loyalty created successfully",
        data: doc,
    })
});

// /**
//  * Update loyalty (shopId/userId)
//  */
// export const updateLoyalty = catchAsync(async (req, res, next) => {
//     const { id } = req.params;
//     const { shopId, userId } = req.body;

//     const doc = await Loyalty.findById(id);
//     if (!doc) throw new AppError("Loyalty not found", 404);

//     // If changing both, also prevent duplicates
//     const nextShopId = shopId ?? doc.shopId;
//     const nextUserId = userId ?? doc.userId;

//     const duplicate = await Loyalty.findOne({
//         shopId: nextShopId,
//         userId: nextUserId,
//         _id: { $ne: id },
//     });

//     if (duplicate) {
//         throw new AppError("Another loyalty already exists for this shop & user", 409);
// }

// doc.shopId = nextShopId;
// doc.userId = nextUserId;

// await doc.save();

// return SendResponse(res, 200, true, "Loyalty updated successfully", doc);
// });

/**
 * Delete loyalty
 */
export const deleteLoyalty = catchAsync(async (req, res, next) => {
    const { id } = req.params;

    const doc = await loyalty.findByIdAndDelete(id);
    if (!doc) throw new AppError(404, "Loyalty not found");

    sendResponse(res, {
        statusCode: 201,
        success: true,
        message: "Loyalty delete successfully",
        data: doc,
    })
});
export const getShopWiseLoyaltyCount = catchAsync(async (req, res, next) => {
  const { shopId } = req.query;

  const match = {};
  if (shopId) {
    if (!mongoose.Types.ObjectId.isValid(shopId)) {
      return next(new AppError("Invalid shopId", 400));
    }
    match.shopId = new mongoose.Types.ObjectId(shopId);
  }

  // const result = await loyalty.aggregate([
  //   { $match: match },
  //   {
  //     $group: {
  //       _id: "$shopId",
  //       count: { $sum: 1 }, // loyal users count (records)
  //     },
  //   },
  //   { $sort: { count: -1 } },
  //   {
  //     $lookup: {
  //       from: "users",
  //       localField: "_id",
  //       foreignField: "_id",
  //       as: "shop",
  //     },
  //   },
  //   { $unwind: { path: "$shop", preserveNullAndEmptyArrays: true } },
  //   {
  //     $project: {
  //       _id: 0,
  //       shopId: "$_id",
  //       count: 1,
  //       shop: {
  //         _id: "$shop._id",
  //         name: "$shop.name",
  //         email: "$shop.email",
  //         avatar: "$shop.avatar",
  //       },
  //     },
  //   },
  // ]);
    
  const result = await loyalty.findOne({userId: req.user._id, shopId: req.query.shopId}).populate("shopId", "name email avatar").populate("userId", "name email avatar");
  
  sendResponse(res,{
    statusCode: 200,
    success: true,
    message: "Loyalty fetched successfully",
    data: result,
  })
});

export const getUserLoyaltyPointsShopWise = catchAsync(async (req, res, next) => {
  const { userId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return next(new AppError("Invalid userId", 400));
  }

  const uid = new mongoose.Types.ObjectId(userId);

//   let rows = await loyalty.aggregate([
//     { $match: { userId: uid } },
//     {
//       $group: {
//         _id: "$shopId",
//         points: { $sum: 1 }, // points = count of records for that shop
//       },
//     },
//     { $sort: { points: -1 } },
//     {
//       $lookup: {
//         from: "users",
//         localField: "_id",
//         foreignField: "_id",
//         as: "shop",
//       },
//     },
//     { $unwind: { path: "$shop", preserveNullAndEmptyArrays: true } },
//     {
//       $project: {
//         _id: 0,
//         shopId: "$_id",
//         points: 1,
//         shop: {
//           _id: "$shop._id",
//           name: "$shop.name",
//           email: "$shop.email",
//         },
//       },
//     },
//   ]);
// for (const r of rows) {
//   if (r.points > 10) {
//     await loyalty.updateOne(
//       { shopId: r.shopId, userId: r.userId },
//       {
//         $inc: { totalGiftPoints: 1 },
//       }
//     );
//     r.points = r.points - 10; // reset points after converting to gift point
//   }
// }

  const loyaltyDoc = await loyalty.find({ userId: uid }).populate("shopId", "name email avatar").populate("userId", "name email avatar");

  const totalPoints = loyaltyDoc ? loyaltyDoc.visitCount : 0;

    sendResponse(res,{
    statusCode: 200,
    success: true,
    message: "Loyalty fetched successfully",
    data: loyaltyDoc,
  })
});
