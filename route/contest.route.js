import express from "express";

import {
  deleteParticipation,
  getHallOfFame,
  participateInContest,
  updateParticipation,
  voteForParticipation,
} from "../controller/berber.controller.js";
import { getCurrentContest } from "../controller/user.controller.js";
import { protect } from "../middleware/auth.middleware.js";
import upload from "../middleware/multer.middleware.js";

const router = express.Router(protect);

router.get("/contests/current", getCurrentContest);
router.get("/contests/hall-of-fame", getHallOfFame);
router.post(
  "/contests/participate",
  upload.single("photo"),
  participateInContest
);
router.put(
  "/contests/participate",
  upload.single("photo"),
  updateParticipation
);
router.delete("/contests/participate", deleteParticipation);
router.post("/contests/:participationId/vote", voteForParticipation);

export default router;
