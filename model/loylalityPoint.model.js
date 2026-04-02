import mongoose, { Schema } from "mongoose";

const loyaltySchema = new Schema(
  {
    shopId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    campaignId: { type: Schema.Types.ObjectId, ref: "Campaign", required: true },
    campaignState: {
      type: String,
      enum: ["upcoming", "active", "ended"],
      default: "active",
    },
    totalGiftPoints: { type: Number, default: 0 },
    visitCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

loyaltySchema.index({ shopId: 1, userId: 1, campaignId: 1 }, { unique: true });

export const loyalty = mongoose.model("loyalty", loyaltySchema);
