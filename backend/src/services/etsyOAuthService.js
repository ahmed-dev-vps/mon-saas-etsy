const crypto = require("crypto");
const env = require("../config/env");

const pkceStore = new Map();
const PKCE_TTL_MS = 10 * 60 * 1000;

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

function base64Url(buffer) {
  return Buffer.from(buffer).toString("base64url");
}

function generateCodeVerifier() {
  return base64Url(crypto.randomBytes(64));
}

function generateCodeChallenge(codeVerifier) {
  const hashed = crypto.createHash("sha256").update(codeVerifier).digest();
  return base64Url(hashed);
}

function cleanupPkceStore() {
  const now = Date.now();
  for (const [state, item] of pkceStore.entries()) {
    if (now - item.createdAt > PKCE_TTL_MS) {
      pkceStore.delete(state);
    }
  }
}

function createPkceSession(userId) {
  cleanupPkceStore();

  const state = base64Url(crypto.randomBytes(24));
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);

  pkceStore.set(state, {
    userId,
    codeVerifier,
    createdAt: Date.now(),
  });

  return {
    state,
    codeVerifier,
    codeChallenge,
  };
}

function consumePkceSession(state) {
  cleanupPkceStore();
  const session = pkceStore.get(state);
  if (!session) {
    return null;
  }
  pkceStore.delete(state);
  return session;
}

function buildAuthUrl({ userId, scope }) {
  if (!isConfiguredValue(env.etsy.clientId) || !isConfiguredValue(env.etsy.redirectUri)) {
    throw new Error("Missing Etsy OAuth configuration (ETSY_CLIENT_ID / ETSY_REDIRECT_URI)");
  }

  const { state, codeChallenge } = createPkceSession(userId);
  const authUrl = new URL("https://www.etsy.com/oauth/connect");
  authUrl.searchParams.set("client_id", env.etsy.clientId);
  authUrl.searchParams.set("redirect_uri", env.etsy.redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", scope || env.etsy.scope);
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("code_challenge", codeChallenge);
  authUrl.searchParams.set("code_challenge_method", "S256");

  return authUrl.toString();
}

async function exchangeCodeForToken({ code, codeVerifier }) {
  const response = await fetch("https://api.etsy.com/v3/public/oauth/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      grant_type: "authorization_code",
      client_id: env.etsy.clientId,
      redirect_uri: env.etsy.redirectUri,
      code,
      code_verifier: codeVerifier,
    }),
  });

  const payload = await response.json();
  if (!response.ok) {
    const err = new Error(payload.error_description || payload.error || "Failed token exchange with Etsy");
    err.details = payload;
    throw err;
  }

  return payload;
}

async function getShopId(accessToken) {
  const response = await fetch("https://api.etsy.com/v3/application/shops", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "x-api-key": env.etsy.clientId,
    },
  });

  const payload = await response.json();
  if (!response.ok) {
    const err = new Error("Failed to fetch Etsy shop information");
    err.details = payload;
    throw err;
  }

  const first = payload.results?.[0];
  const shopId = first?.shop_id || first?.shopId || first?.id || null;
  if (!shopId) {
    throw new Error("No Etsy shop found for this token");
  }

  return String(shopId);
}

module.exports = {
  generateCodeVerifier,
  generateCodeChallenge,
  exchangeCodeForToken,
  getShopId,
  buildAuthUrl,
  consumePkceSession,
};
