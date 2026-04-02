import express from "express";
import { createLoyalty, deleteLoyalty, getAllLoyalties, getLoyaltyById, getShopWiseLoyaltyCount, getUserLoyaltyPointsShopWise } from "../controller/loyality.controller.js";
import { protect } from "../middleware/auth.middleware.js";


const router = express.Router();

router.use(protect); // Add auth middleware if needed

router.route("/")
  .post(createLoyalty)
  .get(getAllLoyalties);

router.get("/counts/shop-wise", getShopWiseLoyaltyCount);
router.get("/user/:userId/points", getUserLoyaltyPointsShopWise);

router.route("/:id")
  .get(getLoyaltyById)
  .delete(deleteLoyalty);

export default router;
