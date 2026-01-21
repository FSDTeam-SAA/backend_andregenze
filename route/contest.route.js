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

router.use(protect);

router.get("/current", getCurrentContest);
router.get("/web-current", getHallOfFameWeb);
router.get("/hall-of-fame", getHallOfFame);
router.post("/participate", upload.single("photo"), participateInContest);
router.put("/participate", upload.single("photo"), updateParticipation);
router.delete("/participate", deleteParticipation);
router.post("/:participationId/vote", voteForParticipation);

export default router;
