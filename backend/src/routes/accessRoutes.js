const express = require("express");
const { verifyOrderAccess } = require("../controllers/accessController");

const router = express.Router();

router.post("/verify", verifyOrderAccess);

module.exports = router;
