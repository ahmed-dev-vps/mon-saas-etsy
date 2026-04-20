const { createSeller, authenticateSeller, deleteSellerAccount } = require("../services/userService");
const { issueSellerToken } = require("../services/tokenService");
const { getEtsyConnectionByUserId } = require("../repositories/etsyConnectionRepository");
const env = require("../config/env");

function isConfiguredValue(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) {
    return false;
  }
  if (normalized.includes("your_") || normalized.includes("change-me")) {
    return false;
  }
  return true;
}

async function signupSeller(req, res) {
  const { email, password } = req.body;
  if (!email || !password || password.length < 6) {
    return res.status(400).json({ message: "email and password (min 6 chars) are required" });
  }

  const user = await createSeller({ email, password });
  if (!user) {
    return res.status(409).json({ message: "Seller already exists" });
  }

  const token = issueSellerToken(user);
  return res.status(201).json({ user, token });
}

async function loginSeller(req, res) {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: "email and password are required" });
  }

  const user = await authenticateSeller({ email, password });
  if (!user) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const token = issueSellerToken(user);
  return res.json({ user, token });
}

async function deleteSeller(req, res) {
  const result = await deleteSellerAccount(req.seller.userId);
  if (!result.deleted) {
    return res.status(404).json({ message: "Seller account not found" });
  }

  return res.json({ message: "Seller account deleted" });
}

async function getEtsyStatus(req, res) {
  const oauthConfigured = isConfiguredValue(env.etsy.clientId) && isConfiguredValue(env.etsy.redirectUri);
  const storageConfigured = isConfiguredValue(env.supabase.url) && isConfiguredValue(env.supabase.serviceRoleKey);
  const configured = oauthConfigured && storageConfigured;

  try {
    if (!configured) {
      return res.json({
        connected: false,
        shop_id: null,
        expires_at: null,
        configured: false,
      });
    }

    const connection = await getEtsyConnectionByUserId(req.seller.userId);
    if (!connection) {
      return res.json({
        connected: false,
        shop_id: null,
        expires_at: null,
        configured: true,
      });
    }

    return res.json({
      connected: true,
      shop_id: connection.shop_id,
      expires_at: connection.expires_at,
      configured: true,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Unable to fetch Etsy connection status",
      error: error.message,
    });
  }
}

module.exports = {
  signupSeller,
  loginSeller,
  deleteSeller,
  getEtsyStatus,
};
