import mongoose from "mongoose";

const contactUsSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    lastName: { type: String },
    email: { type: String, required: true },
    phone: { type: String }, // optional
    subject: { type: String },
    message: { type: String, required: true },
  },
  { timestamps: true },
);

export const ContactUs = mongoose.model("ContactUs", contactUsSchema);
