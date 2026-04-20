const crypto = require("crypto");
const env = require("../config/env");

function toBase64Url(value) {
  return Buffer.from(value).toString("base64url");
}

function sign(payload) {
  const payloadEncoded = toBase64Url(JSON.stringify(payload));
  const signature = crypto
    .createHmac("sha256", env.security.tokenSecret)
    .update(payloadEncoded)
    .digest("base64url");

  return `${payloadEncoded}.${signature}`;
}

function issueToken(payload) {
  return sign({
    ...payload,
    exp: Date.now() + env.security.tokenTtlHours * 60 * 60 * 1000,
  });
}

function verify(token) {
  if (!token || !token.includes(".")) {
    return null;
  }

  const [payloadEncoded, signature] = token.split(".");
  const expectedSignature = crypto
    .createHmac("sha256", env.security.tokenSecret)
    .update(payloadEncoded)
    .digest("base64url");

  if (signature !== expectedSignature) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(payloadEncoded, "base64url").toString("utf-8"));
    if (!payload.exp || payload.exp < Date.now()) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

function issueOrderToken(orderId, email) {
  return issueToken({
    type: "client",
    orderId,
    email,
  });
}

function issueOrderTokenWithContext(context) {
  return issueToken({
    type: "client",
    orderId: context.orderId,
    email: context.email,
    productId: context.productId || "",
    canvasId: context.canvasId || "",
  });
}

function issueSellerToken(user) {
  return issueToken({
    type: "seller",
    userId: user.id,
    email: user.email,
    role: "seller",
  });
}

module.exports = {
  issueOrderToken,
  issueOrderTokenWithContext,
  issueSellerToken,
  verify,
};
