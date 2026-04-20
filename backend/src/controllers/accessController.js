const { findOrder } = require("../services/orderService");
const { issueOrderToken } = require("../services/tokenService");
const env = require("../config/env");

async function verifyOrderAccess(req, res) {
  const { orderId, email } = req.body;

  if (!orderId || !email) {
    return res.status(400).json({ message: "orderId and email are required" });
  }

  const order = await findOrder(orderId, email);
  if (!order) {
    return res.status(404).json({ message: "Order not found" });
  }

  const token = issueOrderToken(orderId, email);
  const baseUrl = env.app.frontendUrl.replace(/\/$/, "");
  return res.json({
    token,
    accessLink: `${baseUrl}/index.html?orderId=${encodeURIComponent(orderId)}&token=${encodeURIComponent(token)}`,
  });
}

module.exports = {
  verifyOrderAccess,
};
