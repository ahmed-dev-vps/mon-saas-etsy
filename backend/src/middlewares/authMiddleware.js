const { verify } = require("../services/tokenService");

function requireOrderToken(req, res, next) {
  const token = req.headers.authorization?.replace("Bearer ", "") || req.query.token;
  const payload = verify(token);

  if (!payload) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }

  req.orderAccess = payload;
  return next();
}

module.exports = {
  requireOrderToken,
};
