const { getCanvasById } = require("../services/canvasService");
const {
  listProductsByUser,
  createProductForUser,
  updateProductForUser,
} = require("../services/productService");

async function getSellerProducts(req, res) {
  const products = await listProductsByUser(req.seller.userId);
  return res.json({ products });
}

async function createSellerProduct(req, res) {
  const { title, etsyProductId, linkedCanvasId } = req.body || {};
  if (!title || !etsyProductId) {
    return res.status(400).json({ message: "title and etsyProductId are required" });
  }

  if (linkedCanvasId) {
    const canvas = await getCanvasById(linkedCanvasId);
    const canUse = canvas && (canvas.isGlobal === true || canvas.userId === req.seller.userId);
    if (!canUse) {
      return res.status(400).json({ message: "linkedCanvasId is invalid for this seller" });
    }
  }

  const product = await createProductForUser(req.seller.userId, req.body);
  return res.status(201).json({ product });
}

async function updateSellerProduct(req, res) {
  const { linkedCanvasId } = req.body || {};
  if (linkedCanvasId) {
    const canvas = await getCanvasById(linkedCanvasId);
    const canUse = canvas && (canvas.isGlobal === true || canvas.userId === req.seller.userId);
    if (!canUse) {
      return res.status(400).json({ message: "linkedCanvasId is invalid for this seller" });
    }
  }

  const product = await updateProductForUser(req.seller.userId, req.params.productId, req.body || {});
  if (!product) {
    return res.status(404).json({ message: "Product not found" });
  }
  return res.json({ product });
}

module.exports = {
  getSellerProducts,
  createSellerProduct,
  updateSellerProduct,
};
