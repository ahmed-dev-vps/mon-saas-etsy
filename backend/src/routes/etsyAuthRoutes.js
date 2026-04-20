const express = require("express");
const { startEtsyOAuth, etsyOAuthCallback } = require("../controllers/etsyAuthController");

const router = express.Router();

router.get("/etsy", startEtsyOAuth);
router.get("/etsy/callback", etsyOAuthCallback);

module.exports = router;
