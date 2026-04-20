const express = require("express");
const { requireOrderToken } = require("../middlewares/authMiddleware");
const {
  getOrderDesign,
  saveOrderDesign,
  getMockupPreview,
  exportDesignImage,
} = require("../controllers/designController");

const router = express.Router();

router.use(requireOrderToken);
router.get("/:orderId", getOrderDesign);
router.post("/:orderId", saveOrderDesign);
router.get("/:orderId/mockup", getMockupPreview);
router.get("/:orderId/export", exportDesignImage);

module.exports = router;
