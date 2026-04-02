import express from "express";
import { createContest, deleteUser, getContestById, getContests, updateContest, updateUserStatus } from "../controller/admin.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

router.use(protect);

// Contests
router.post("/contests", createContest);
router.get("/contests", getContests);
router.get("/contests/:id", getContestById);
router.put("/contests/:id", updateContest);
router.post("/block-user/:userId", updateUserStatus);
router.delete("/users/:id", deleteUser);

export default router;