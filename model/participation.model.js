import mongoose, { Schema } from "mongoose";

const participationSchema = new Schema(
  {
    contest: { type: Schema.Types.ObjectId, ref: "Contest", required: true },
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    photo: {
      public_id: { type: String },
      url: { type: String },
    },
    description: { type: String, maxlength: 500 },
    votes: { type: Number, default: 0 },
    frame: { type: String },
    submittedAt: { type: Date, default: Date.now },
    isDisqualified: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const Participation = mongoose.model(
  "Participation",
  participationSchema
);
