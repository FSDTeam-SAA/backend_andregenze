import express from "express";
import {
  changePassword,
  getProfile,
  updateProfile,
  deleteAccount,
  updateSettings,
  searchBerbers,
  createReservation,
  updateReservation,
  deleteReservation,
  getMyReservations,
  addReview,
  getReviews,
} from "../controller/user.controller.js";
import { protect } from "../middleware/auth.middleware.js";
import upload from "../middleware/multer.middleware.js";

const router = express.Router();

router.get("/profile", protect, getProfile);
router.put(
  "/profile",
  protect,
  upload.fields([
    { name: "avatar", maxCount: 1 },
    { name: "shopLogo", maxCount: 1 },
    { name: "portfolioImages", maxCount: 10 },
  ]),
  updateProfile
);
router.put("/password", protect, changePassword);
router.delete("/account", protect, deleteAccount);
router.put("/settings", protect, updateSettings);

// Search
router.get("/berbers", searchBerbers);

// Reservations
router.post("/reservations", createReservation);
router.get("/reservations", getMyReservations);
router.put("/reservations/:id", updateReservation);
router.delete("/reservations/:id", deleteReservation);

// Reviews
router.post("/reviews", addReview);
router.get("/reviews/:berberId", getReviews);

export default router;
