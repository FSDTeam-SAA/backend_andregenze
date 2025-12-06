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
  { timestamps: true }
);

// Static for avg rating
reviewSchema.statics.getAverageRating = async function (berberId) {
  const result = await this.aggregate([
    { $match: { berber: berberId } },
    { $group: { _id: null, avg: { $avg: "$rating" } } },
  ]);
  return result[0]?.avg || 0;
};

export const Review = mongoose.model("Review", reviewSchema);
