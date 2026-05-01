import mongoose, { Schema } from "mongoose";

const loyaltySchema = new Schema(
  {
    shopId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    campaignId: { type: Schema.Types.ObjectId, ref: "Campaign", required: true },
  },
  { timestamps: true }
);


export const loyaltyPoint = mongoose.model("loyaltyPoints", loyaltySchema);
