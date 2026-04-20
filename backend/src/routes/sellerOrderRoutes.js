const express = require("express");
const { requireSellerToken } = require("../middlewares/sellerAuthMiddleware");
const { getSellerOrders, createSellerOrder } = require("../controllers/sellerOrderController");

const router = express.Router();

router.use(requireSellerToken);
router.get("/", getSellerOrders);
router.post("/", createSellerOrder);

module.exports = router;
