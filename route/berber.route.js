import express from "express";
import {
  setupBerberProfile,
  updateBerberProfile,
  createCampaign,
  updateCampaign,
  getMyCampaigns,
  getCampaignStats,
  getMyReservationsAsBerber,
  confirmReservation,
  addStuff,
  getStaffMembers,
  deleteStuff
} from "../controller/berber.controller.js";
import { protect } from "../middleware/auth.middleware.js";
import upload from "../middleware/multer.middleware.js";

const router = express.Router();

router.use(protect);

// Profile setup
router.post(
  "/profile/setup",
  upload.fields([
    { name: "shopLogo", maxCount: 1 },
    { name: "portfolioImages", maxCount: 10 },
  ]),
  setupBerberProfile,
);
router.put(
  "/profile/update",
  upload.fields([
    { name: "shopLogo", maxCount: 1 },
    { name: "portfolioImages", maxCount: 10 },
  ]),
  updateBerberProfile,
);

router.get("/staff-members", protect, getStaffMembers);
router.patch("/staff-members", protect, addStuff);
router.delete("/staff-members/:id", protect, deleteStuff);

// campaigns and contests routes
router.post("/campaigns", createCampaign);
router.put("/campaigns/:id", updateCampaign);
router.get("/campaigns", getMyCampaigns);
router.get("/campaigns/:id/stats", getCampaignStats);

router.get("/reservations", getMyReservationsAsBerber);
router.put("/reservations/:id/confirm", confirmReservation);

export default router;
