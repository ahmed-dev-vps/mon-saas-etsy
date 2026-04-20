const crypto = require("crypto");
const { readJson, writeJson } = require("../utils/fileStore");

async function listProductsByUser(userId) {
  const products = await readJson("products.json", []);
  return products.filter((product) => product.userId === userId);
}

async function findProductByIdForUser(userId, productId) {
  const products = await readJson("products.json", []);
  return products.find((product) => product.id === productId && product.userId === userId) || null;
}

async function createProductForUser(userId, payload) {
  const products = await readJson("products.json", []);
  const product = {
    id: `prd_${crypto.randomBytes(6).toString("hex")}`,
    userId,
    title: payload.title,
    etsyProductId: payload.etsyProductId,
    linkedCanvasId: payload.linkedCanvasId || "",
    createdAt: new Date().toISOString(),
  };
  products.push(product);
  await writeJson("products.json", products);
  return product;
}

async function updateProductForUser(userId, productId, payload) {
  const products = await readJson("products.json", []);
  const target = products.find((product) => product.id === productId && product.userId === userId);
  if (!target) {
    return null;
  }

  target.title = payload.title ?? target.title;
  target.etsyProductId = payload.etsyProductId ?? target.etsyProductId;
  target.linkedCanvasId = payload.linkedCanvasId ?? target.linkedCanvasId;
  await writeJson("products.json", products);
  return target;
}

module.exports = {
  listProductsByUser,
  findProductByIdForUser,
  createProductForUser,
  updateProductForUser,
};
