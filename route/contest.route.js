import express from "express";

import {
  deleteParticipation,
  getHallOfFame,
  participateInContest,
  updateParticipation,
  voteForParticipation,
  getHallOfFameWeb,
} from "../controller/berber.controller.js";
import { getCurrentContest } from "../controller/user.controller.js";
import { protect } from "../middleware/auth.middleware.js";
import upload from "../middleware/multer.middleware.js";

const router = express.Router();

router.get("/current", protect, getCurrentContest);
router.get("/web-current", getHallOfFameWeb);
router.get("/hall-of-fame", protect, getHallOfFame);
router.post(
  "/participate",
  protect,
  upload.single("photo"),
  participateInContest,
);
router.put(
  "/participate",
  protect,
  upload.single("photo"),
  updateParticipation,
);
router.delete("/participate", protect, deleteParticipation);
router.post("/:participationId/vote", protect, voteForParticipation);

export default router;
