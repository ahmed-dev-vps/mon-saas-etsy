const env = require("../config/env");
const { issueOrderTokenWithContext } = require("../services/tokenService");
const { listOrdersByUser, createOrderForUser } = require("../services/orderService");
const { findProductByIdForUser } = require("../services/productService");
const { getCanvasById } = require("../services/canvasService");

function buildClientLink(order) {
  const token = issueOrderTokenWithContext({
    orderId: order.orderId,
    email: order.email,
    productId: order.productId,
    canvasId: order.canvasId,
  });
  const baseUrl = env.app.frontendUrl.replace(/\/$/, "");
  return `${baseUrl}/index.html?orderId=${encodeURIComponent(order.orderId)}&token=${encodeURIComponent(token)}&canvasId=${encodeURIComponent(order.canvasId || "")}`;
}

function decorateOrder(order) {
  return {
    ...order,
    clientLink: buildClientLink(order),
  };
}

async function getSellerOrders(req, res) {
  const orders = await listOrdersByUser(req.seller.userId);
  return res.json({
    orders: orders.map(decorateOrder),
  });
}

async function createSellerOrder(req, res) {
  const { email, productId } = req.body;
  if (!email || !productId) {
    return res.status(400).json({ message: "Client email and productId are required" });
  }

  const product = await findProductByIdForUser(req.seller.userId, productId);
  if (!product) {
    return res.status(404).json({ message: "Product not found for this seller" });
  }
  if (!product.linkedCanvasId) {
    return res.status(400).json({ message: "Product has no linked canvas" });
  }

  const canvas = await getCanvasById(product.linkedCanvasId);
  const canUse = canvas && (canvas.isGlobal === true || canvas.userId === req.seller.userId);
  if (!canUse) {
    return res.status(400).json({ message: "Linked canvas is invalid" });
  }

  const order = await createOrderForUser(req.seller.userId, email, {
    productId: product.id,
    etsyProductId: product.etsyProductId,
    canvasId: canvas.id,
    canvas: {
      id: canvas.id,
      name: canvas.name,
      type: canvas.type,
      width: canvas.width,
      height: canvas.height,
      printableArea: canvas.printableArea,
      mockupUrl: canvas.mockupUrl || "",
      isGlobal: Boolean(canvas.isGlobal),
    },
  });
  return res.status(201).json({
    order: decorateOrder(order),
  });
}

module.exports = {
  getSellerOrders,
  createSellerOrder,
};
