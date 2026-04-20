const express = require("express");
const { requireSellerToken } = require("../middlewares/sellerAuthMiddleware");
const {
  getSellerCanvases,
  createSellerCanvas,
  updateSellerCanvas,
} = require("../controllers/sellerCanvasController");

const router = express.Router();

router.use(requireSellerToken);
router.get("/", getSellerCanvases);
router.post("/", createSellerCanvas);
router.put("/:canvasId", updateSellerCanvas);

module.exports = router;
