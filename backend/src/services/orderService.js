const crypto = require("crypto");
const { readJson, writeJson } = require("../utils/fileStore");

async function findOrder(orderId, email) {
  const orders = await readJson("orders.json", []);
  return orders.find((order) => order.orderId === orderId && order.email === email) || null;
}

async function findOrderById(orderId) {
  const orders = await readJson("orders.json", []);
  return orders.find((order) => order.orderId === orderId) || null;
}

async function listOrdersByUser(userId) {
  const orders = await readJson("orders.json", []);
  return orders.filter((order) => order.userId === userId);
}

function generateOrderId() {
  return `ORD-${crypto.randomInt(100000, 999999)}`;
}

async function createOrderForUser(userId, email, options = {}) {
  const orders = await readJson("orders.json", []);
  const order = {
    orderId: generateOrderId(),
    email,
    userId,
    productId: options.productId || "",
    etsyProductId: options.etsyProductId || "",
    canvasId: options.canvasId || "",
    canvas: options.canvas || null,
    designStatus: "pending",
    createdAt: new Date().toISOString(),
  };
  orders.push(order);
  await writeJson("orders.json", orders);
  return order;
}

async function updateOrderStatus(orderId, status) {
  const orders = await readJson("orders.json", []);
  const target = orders.find((order) => order.orderId === orderId);
  if (!target) {
    return null;
  }
  target.designStatus = status;
  await writeJson("orders.json", orders);
  return target;
}

module.exports = {
  findOrder,
  findOrderById,
  listOrdersByUser,
  createOrderForUser,
  updateOrderStatus,
};
