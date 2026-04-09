import mongoose, { Schema } from "mongoose";

const reviewSchema = new Schema(
  {
    berber: { type: Schema.Types.ObjectId, ref: "User", required: true },
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    rating: {
      type: Number,
      min: [1, "Rating min 1"],
      max: [5, "Rating max 5"],
      required: true,
    },
    text: { type: String, maxlength: 500 },
    reservation: { type: Schema.Types.ObjectId, ref: "Reservation" },
  },
  { timestamps: true },
);

// Get average rating only
reviewSchema.statics.getAverageRating = async function (berberId) {
  const result = await this.aggregate([
    {
      $match: {
        berber: new mongoose.Types.ObjectId(berberId),
      },
    },
    {
      $group: {
        _id: null,
        avg: { $avg: "$rating" },
      },
    },
  ]);

  return result[0]?.avg || 0;
};

// Get review count only
reviewSchema.statics.getReviewCount = async function (berberId) {
  const result = await this.aggregate([
    {
      $match: {
        berber: new mongoose.Types.ObjectId(berberId),
      },
    },
    {
      $count: "totalReviews",
    },
  ]);

  return result[0]?.totalReviews || 0;
};

// Get average rating + total review count together
reviewSchema.statics.getReviewStats = async function (berberId) {
  const result = await this.aggregate([
    {
      $match: {
        berber: new mongoose.Types.ObjectId(berberId),
      },
    },
    {
      $group: {
        _id: null,
        avgRating: { $avg: "$rating" },
        totalReviews: { $sum: 1 },
      },
    },
    {
      $project: {
        _id: 0,
        avgRating: { $round: ["$avgRating", 1] },
        totalReviews: 1,
      },
    },
  ]);

  return {
    avgRating: result[0]?.avgRating || 0,
    totalReviews: result[0]?.totalReviews || 0,
  };
};

export const Review = mongoose.model("Review", reviewSchema);
