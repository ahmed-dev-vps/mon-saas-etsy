const crypto = require("crypto");
const { readJson, writeJson } = require("../utils/fileStore");

function hashPassword(password) {
  return crypto.createHash("sha256").update(password).digest("hex");
}

function sanitizeUser(user) {
  return {
    id: user.id,
    email: user.email,
    role: "seller",
    createdAt: user.createdAt,
  };
}

async function findUserByEmail(email) {
  const users = await readJson("users.json", []);
  return users.find((user) => user.email === email) || null;
}

async function createSeller({ email, password }) {
  const users = await readJson("users.json", []);
  const existing = users.find((user) => user.email === email);
  if (existing) {
    return null;
  }

  const user = {
    id: `usr_${crypto.randomBytes(6).toString("hex")}`,
    email,
    passwordHash: hashPassword(password),
    role: "seller",
    createdAt: new Date().toISOString(),
  };
  users.push(user);
  await writeJson("users.json", users);
  return sanitizeUser(user);
}

async function authenticateSeller({ email, password }) {
  const user = await findUserByEmail(email);
  if (!user) {
    return null;
  }

  const isValid = user.passwordHash === hashPassword(password);
  if (!isValid) {
    return null;
  }

  return sanitizeUser(user);
}

async function deleteSellerAccount(userId) {
  const [users, orders, products, canvases, designs] = await Promise.all([
    readJson("users.json", []),
    readJson("orders.json", []),
    readJson("products.json", []),
    readJson("canvases.json", []),
    readJson("designs.json", {}),
  ]);

  const userExists = users.some((user) => user.id === userId);
  if (!userExists) {
    return { deleted: false };
  }

  const remainingUsers = users.filter((user) => user.id !== userId);
  const sellerOrders = orders.filter((order) => order.userId === userId);
  const sellerOrderIds = new Set(sellerOrders.map((order) => order.orderId));

  const remainingOrders = orders.filter((order) => order.userId !== userId);
  const remainingProducts = products.filter((product) => product.userId !== userId);
  const remainingCanvases = canvases.filter((canvas) => !(canvas.userId === userId && !canvas.isGlobal));

  const remainingDesigns = { ...designs };
  for (const orderId of sellerOrderIds) {
    delete remainingDesigns[orderId];
  }

  await Promise.all([
    writeJson("users.json", remainingUsers),
    writeJson("orders.json", remainingOrders),
    writeJson("products.json", remainingProducts),
    writeJson("canvases.json", remainingCanvases),
    writeJson("designs.json", remainingDesigns),
  ]);

  return { deleted: true };
}

module.exports = {
  createSeller,
  authenticateSeller,
  deleteSellerAccount,
};
