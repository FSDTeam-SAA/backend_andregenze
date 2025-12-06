import express from "express";
import { createContest, getContests } from "../controller/admin.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

router.use(protect);

// Contests
router.post("/contests", createContest);
router.get("/contests", getContests);

export default router;
