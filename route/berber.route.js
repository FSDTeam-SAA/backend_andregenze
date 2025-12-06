import express from "express";
import {
  setupBerberProfile,
  createCampaign,
  getMyCampaigns,
  getCampaignStats,
  getMyReservationsAsBerber,
  confirmReservation,
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
  setupBerberProfile
);

// campaigns and contests routes
router.post("/campaigns", createCampaign);
router.get("/campaigns", getMyCampaigns);
router.get("/campaigns/:id/stats", getCampaignStats);

router.get("/reservations", getMyReservationsAsBerber);
router.put("/reservations/:id/confirm", confirmReservation);

export default router;
