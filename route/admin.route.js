import express from "express";
import { createContest, getContestById, getContests, updateContest } from "../controller/admin.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

router.use(protect);

// Contests
router.post("/contests", createContest);
router.get("/contests", getContests);
router.get("/contests/:id", getContestById);
router.put("/contests/:id", updateContest);

export default router;