import mongoose, { Schema } from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new Schema(
  {
    name: { type: String, maxlength: 100 },
    shopName: { type: String, maxlength: 100 },
    email: {
      type: String,
      trim: true,
      unique: true,
      lowercase: true,
    },
    password: { type: String, select: false },
    phone: {
      type: String,
      trim: true,
    },
    bio: { type: String, maxlength: 500 },
    shopDescription: { type: String, maxlength: 500 },
    gender: {
      type: String,
      enum: ["male", "female", "other"],
    },
    dob: {
      type: Date,
    },
    avatar: {
      public_id: { type: String, default: "" },
      url: { type: String, default: "" },
    },
    shopLogo: {
      public_id: { type: String, default: "" },
      url: { type: String, default: "" },
    },
    address2: { type: String },
    address: {
      street: { type: String },
      houseNumber: { type: String },
      postalCode: { type: String },
      city: { type: String },
      country: { type: String },
      location: {
        type: {
          type: String,
          enum: ["Point"],
        },
        coordinates: {
          type: [Number],
        },
      },
    },
    socialMedia: {
      facebook: { type: String },
      instagram: { type: String },
      tiktok: { type: String },
    },
    staffMembers: [{ type: String }],
    openingHours: [
      {
        day: {
          type: String,
          enum: [
            "monday",
            "tuesday",
            "wednesday",
            "thursday",
            "friday",
            "saturday",
            "sunday",
          ],
        },
        open: { type: String },
        close: { type: String },
        isClosed: { type: Boolean, default: false },
      },
    ],
    services: [
      {
        name: { type: String, maxlength: 100 },
        price: { type: Number, min: 0 },
        description: { type: String, maxlength: 140 },
      },
    ],
    languages: [{ type: String }],
    acceptedPayments: [
      {
        type: String,
        enum: ["cash", "credit_card", "paypal", "bank_card"],
      },
    ],
    portfolioImages: [
      {
        public_id: { type: String },
        url: { type: String },
        description: { type: String, maxlength: 500 },
      },
    ],
    notifications: {
      type: Boolean,
      default: true,
    },
    language: {
      type: String,
      default: "en",
    },
    showNotifications: { type: Boolean, default: true },
    emailNewsUpdates: { type: Boolean, default: false },
    emailBirthdayGifts: { type: Boolean, default: false },
    dataPrivacyConsent: { type: Boolean, default: false },
    role: {
      type: String,
      enum: ["user", "berber", "admin"],
      default: "user",
    },
    vendorStatus: {
      type: String,
      enum: ["pending", "verified"],
      default: "verified"
    },
    verificationInfo: {
      verified: { type: Boolean, default: false },
      token: { type: String, default: "" },
    },
    password_reset_token: { type: String, default: "" },
    refreshToken: { type: String, default: "" },
    isEmailVerified: { type: Boolean, default: false },
    resetPasswordOTP: { type: String },
    resetPasswordOTPExpiry: { type: Date },
    deleteReason: { type: String },
  },
  { timestamps: true }
);

userSchema.pre("save", async function (next) {
  if (this.isModified("password")) {
    const saltRounds = Number(process.env.bcrypt_salt_round) || 10;
    this.password = await bcrypt.hash(this.password, saltRounds);
  }

  // Set geo coordinates in address.location if lat/lng provided
  if (
    this.role === "berber" &&
    this.isModified("address") &&
    this.constructor.reqBody?.lat &&
    this.constructor.reqBody?.lng
  ) {
    // Pass via static reqBody
    this.address.location = {
      type: "Point",
      coordinates: [
        parseFloat(this.constructor.reqBody.lng),
        parseFloat(this.constructor.reqBody.lat),
      ],
    };
  }

  next();
});

// Statics (unchanged)
userSchema.statics.isUserExistsByEmail = async function (email) {
  return await this.findOne({ email }).select("+password");
};

userSchema.statics.isOTPVerified = async function (id) {
  const user = await this.findById(id).select("+verificationInfo");
  return user?.verificationInfo.verified;
};

userSchema.statics.isPasswordMatched = async function (
  plainTextPassword,
  hashPassword
) {
  return await bcrypt.compare(plainTextPassword, hashPassword);
};

// Geo index
userSchema.index(
  { "address.location": "2dsphere" },
  { partialFilterExpression: { "address.location.coordinates": { $exists: true } } }
);


export const User = mongoose.model("User", userSchema);
