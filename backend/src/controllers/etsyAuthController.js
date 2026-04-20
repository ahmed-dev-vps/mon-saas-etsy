const { verify } = require("../services/tokenService");
const env = require("../config/env");
const {
  buildAuthUrl,
  consumePkceSession,
  exchangeCodeForToken,
  getShopId,
} = require("../services/etsyOAuthService");
const {
  upsertEtsyConnection,
  getAnyEtsyConnection,
  getEtsyConnectionWithTokenByUserId,
} = require("../repositories/etsyConnectionRepository");

function resolveUserId(req) {
  const bearer = req.headers.authorization?.replace("Bearer ", "");
  const payload = verify(bearer);
  if (payload?.type === "seller" && payload?.userId) {
    return payload.userId;
  }
  return req.query.user_id || req.query.userId || null;
}

async function startEtsyOAuth(req, res) {
  try {
    const userId = resolveUserId(req);
    if (!userId) {
      return res.status(400).json({ message: "Missing user context for Etsy OAuth (seller token or user_id query)" });
    }

    const oauthUrl = buildAuthUrl({
      userId,
      scope: req.query.scope,
    });

    console.info("[Etsy OAuth] Redirecting to Etsy authorization", { userId });
    return res.redirect(oauthUrl);
  } catch (error) {
    console.error("[Etsy OAuth] Failed to start authorization", error);
    return res.status(500).json({ message: "Unable to start Etsy OAuth", error: error.message });
  }
}

async function etsyOAuthCallback(req, res) {
  try {
    const { code, state } = req.query;
    console.info("[Etsy OAuth] Callback received", { hasCode: Boolean(code), hasState: Boolean(state) });
    if (!code || !state) {
      return res.status(400).json({ message: "Missing code or state in Etsy callback" });
    }

    const pkceSession = consumePkceSession(state);
    if (!pkceSession) {
      return res.status(400).json({ message: "Invalid or expired OAuth state" });
    }

    console.info("[Etsy OAuth] Exchanging authorization code", { userId: pkceSession.userId });
    const tokenPayload = await exchangeCodeForToken({
      code,
      codeVerifier: pkceSession.codeVerifier,
    });
    console.info("[Etsy OAuth] Token exchange successful", {
      userId: pkceSession.userId,
      hasAccessToken: Boolean(tokenPayload.access_token),
      hasRefreshToken: Boolean(tokenPayload.refresh_token),
    });

    const accessToken = tokenPayload.access_token;
    const refreshToken = tokenPayload.refresh_token;
    const expiresIn = Number(tokenPayload.expires_in || 0);
    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

    console.info("[Etsy OAuth] Fetching Etsy shop_id", { userId: pkceSession.userId });
    const shopId = await getShopId(accessToken);
    console.info("[Etsy OAuth] Etsy shop_id resolved", { userId: pkceSession.userId, shopId });

    console.info("[Etsy OAuth] Saving Etsy connection to database", { userId: pkceSession.userId, shopId });
    await upsertEtsyConnection({
      user_id: pkceSession.userId,
      shop_id: shopId,
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_at: expiresAt,
    });

    console.info("[Etsy OAuth] Connection saved successfully", {
      userId: pkceSession.userId,
      shopId,
    });

    const result = {
      message: "Etsy shop connected successfully",
      user_id: pkceSession.userId,
      shop_id: shopId,
      expires_at: expiresAt,
    };

    if (req.query.format === "json") {
      return res.json(result);
    }

    const redirectUrl = new URL(`${env.app.frontendUrl.replace(/\/$/, "")}/seller.html`);
    redirectUrl.searchParams.set("etsy", "connected");
    redirectUrl.searchParams.set("shop_id", shopId);
    return res.redirect(redirectUrl.toString());
  } catch (error) {
    console.error("[Etsy OAuth] Callback processing failed", error);
    if (req.query.format === "json") {
      return res.status(500).json({
        message: "Etsy OAuth callback failed",
        error: error.message,
      });
    }

    const redirectUrl = new URL(`${env.app.frontendUrl.replace(/\/$/, "")}/seller.html`);
    redirectUrl.searchParams.set("etsy", "error");
    redirectUrl.searchParams.set("message", error.message);
    return res.redirect(redirectUrl.toString());
  }
}

async function testEtsy(req, res) {
  try {
    const userId = req.query.user_id || req.query.userId || null;
    const connection = userId
      ? await getEtsyConnectionWithTokenByUserId(userId)
      : await getAnyEtsyConnection();

    if (!connection) {
      return res.status(404).json({ message: "No Etsy connection found in database" });
    }

    const endpoint = `https://api.etsy.com/v3/application/shops/${connection.shop_id}/receipts`;
    const response = await fetch(endpoint, {
      method: "GET",
      headers: {
        "x-api-key": env.etsy.clientId,
        Authorization: `Bearer ${connection.access_token}`,
      },
    });

    const payload = await response.json();
    if (!response.ok) {
      return res.status(response.status).json({
        message: "Etsy receipts request failed",
        details: payload,
      });
    }

    return res.json({
      shop_id: connection.shop_id,
      user_id: connection.user_id,
      count: payload.count || payload.results?.length || 0,
      orders: payload.results || [],
    });
  } catch (error) {
    console.error("[Etsy OAuth] test-etsy failed", error);
    return res.status(500).json({
      message: "test-etsy failed",
      error: error.message,
    });
  }
}

module.exports = {
  startEtsyOAuth,
  etsyOAuthCallback,
  testEtsy,
};
