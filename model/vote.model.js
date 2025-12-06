import mongoose, { Schema } from "mongoose";

const voteSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    participation: {
      type: Schema.Types.ObjectId,
      ref: "Participation",
      required: true,
    },
  },
  { timestamps: true }
);

export const Vote = mongoose.model("Vote", voteSchema);
