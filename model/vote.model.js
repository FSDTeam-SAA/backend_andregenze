import mongoose, { Schema } from "mongoose";

const voteSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    participation: {
      type: Schema.Types.ObjectId,
      ref: "Participation",
      required: true,
    },
  },
  { timestamps: true }
);

voteSchema.index({ user: 1, participation: 1 }, { unique: true });

export const Vote = mongoose.model("Vote", voteSchema);
