const { verify } = require("../services/tokenService");

function requireSellerToken(req, res, next) {
  const token = req.headers.authorization?.replace("Bearer ", "");
  const payload = verify(token);

  if (!payload || payload.type !== "seller" || payload.role !== "seller") {
    return res.status(401).json({ message: "Invalid seller token" });
  }

  req.seller = payload;
  return next();
}

module.exports = {
  requireSellerToken,
};
