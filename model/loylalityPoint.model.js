import mongoose, { Schema } from "mongoose";

const loyaltySchema = new Schema(
  {
    shopId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    totalGiftPoints: { type: Number, default: 0 },
    visitCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const loyalty = mongoose.model("loyalty", loyaltySchema);
