const express = require("express");
const { requireSellerToken } = require("../middlewares/sellerAuthMiddleware");
const {
  getSellerProducts,
  createSellerProduct,
  updateSellerProduct,
} = require("../controllers/sellerProductController");

const router = express.Router();

router.use(requireSellerToken);
router.get("/", getSellerProducts);
router.post("/", createSellerProduct);
router.put("/:productId", updateSellerProduct);

module.exports = router;
