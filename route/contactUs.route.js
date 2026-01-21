import express from "express";

import {
  createContactUs,
  deleteContactUsById,
  getAllContactUs,
  createWebContactUs,
  getContactUsById,
} from "../controller/contactUs.controller.js";

import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/create", protect, createContactUs);
router.post("/web-create", createWebContactUs);
router.get("/", protect, getAllContactUs);
router.get("/:id", protect, getContactUsById);
router.delete("/:id", protect, deleteContactUsById);

export default router;
