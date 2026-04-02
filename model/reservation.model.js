import mongoose, { Schema } from "mongoose";

const reservationSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    berber: { type: Schema.Types.ObjectId, ref: "User", required: true },
    service: { type: Schema.Types.ObjectId, refPath: "berber.services" },
    serviceName: { type: String },
    price: { type: Number, min: 0 },
    date: { type: Date },
    time: { type: String },
    status: {
      type: String,
      enum: ["pending", "confirmed", "cancelled"],
      default: "pending",
    },
    notes: { type: String },
  },
  { timestamps: true }
);

export const Reservation = mongoose.model("Reservation", reservationSchema);
