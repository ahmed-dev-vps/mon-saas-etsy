const express = require("express");
const { signupSeller, loginSeller, deleteSeller, getEtsyStatus } = require("../controllers/sellerAuthController");
const { requireSellerToken } = require("../middlewares/sellerAuthMiddleware");

const router = express.Router();

router.post("/signup", signupSeller);
router.post("/login", loginSeller);
router.delete("/account", requireSellerToken, deleteSeller);
router.get("/etsy/status", requireSellerToken, getEtsyStatus);

module.exports = router;
