import mongoose, { Schema } from "mongoose";

const contestSchema = new Schema(
  {
    title: { type: String, default: "Beard Contest" },
    description: { type: String, maxlength: 500 },
    startDate: { type: Date },
    endDate: { type: Date },
    isActive: { type: Boolean, default: true },
    participants: [
      { type: Schema.Types.ObjectId, ref: "Participation", required: true },
    ],
    winners: [
      { type: Schema.Types.ObjectId, ref: "Participation", required: true },
    ],
  },
  { timestamps: true }
);

export const Contest = mongoose.model("Contest", contestSchema);
