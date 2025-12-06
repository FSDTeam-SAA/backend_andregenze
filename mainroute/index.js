import express from "express";

import authRoute from "../route/auth.route.js";
import userRoute from "../route/user.route.js";
import paymentRoute from "../route/payment.route.js";
import contactUsRoute from "../route/contactUs.route.js";
import adminRoute from "../route/admin.route.js";
import berberRoute from "../route/berber.route.js";
import contestRoute from "../route/contest.route.js";

const router = express.Router();

// Mounting the routes
router.use("/auth", authRoute);
router.use("/user", userRoute);
router.use("/payment", paymentRoute);
router.use("/contact-us", contactUsRoute);
router.use("/admin", adminRoute);
router.use("/berber", berberRoute);
router.use("/contest", contestRoute);
export default router;
