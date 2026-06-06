import { Router } from "express";
import {
  getNotifications,
  markAsRead,
  markAsReadAll
} from "../controller/notification.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = Router();

router.get("/", protect, getNotifications);
router.patch("/read", protect, markAsRead);
router.patch("/read-all", protect, markAsReadAll);


export default router;
