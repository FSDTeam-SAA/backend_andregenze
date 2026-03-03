import mongoose, { Schema } from "mongoose";

const campaignSchema = new Schema(
  {
    berber: { type: Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, maxlength: 100 },
    discount: { type: String, trim: true },
    type: { type: String },
    startDate: { type: Date },
    endDate: { type: Date },
    totalStamps: { type: Number, default: 10 },
    members: [{ type: Schema.Types.ObjectId, ref: "User", required: true }],
    stats: {
      stampsPerMonth: [
        {
          month: { type: Number, min: 1, max: 12 },
          year: { type: Number },
          count: { type: Number, default: 0 },
        },
      ],
      successRate: { type: Number, default: 0 },
      currentMembers: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

export const Campaign = mongoose.model("Campaign", campaignSchema);
