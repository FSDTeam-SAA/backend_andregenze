import express from "express";
import {
  changePassword,
  getProfile,
  updateProfile,
  deleteAccount,
  updateSettings,
  searchBerbers,
  getBerber,
  createReservation,
  updateReservation,
  deleteReservation,
  getMyReservations,
  addReview,
  getReviews,
  getAllBerbersWeb,
  allUser,
  getAdminDashboard,
} from "../controller/user.controller.js";
import { protect } from "../middleware/auth.middleware.js";
import upload from "../middleware/multer.middleware.js";
import { createFCM } from "../controller/fcm.controller.js";

const router = express.Router();

router.get("/profile", protect, getProfile);
router.get("/get-user", protect, allUser);
router.get("/berbers-web", getAllBerbersWeb);
router.put(
  "/profile",
  protect,
  upload.fields([
    { name: "avatar", maxCount: 1 },
    { name: "shopLogo", maxCount: 1 },
    { name: "portfolioImages", maxCount: 10 },
  ]),
  updateProfile,
);
router.put("/password", protect, changePassword);
router.delete("/account", protect, deleteAccount);
router.put("/settings", protect, updateSettings);

// Search
router.get("/berbers", searchBerbers);
router.get("/berbers/:id", getBerber);

// Reservations
router.post("/reservations", protect, createReservation);
router.get("/reservations", protect, getMyReservations);
router.put("/reservations/:id", protect, updateReservation);
router.delete("/reservations/:id", protect, deleteReservation);

// Reviews
router.post("/reviews", protect, addReview);
router.get("/reviews/:berberId", getReviews);
router.get("/admin/dashboard", getAdminDashboard);

router.post("/update-fcm-token", protect,
  createFCM
);


export default router;
