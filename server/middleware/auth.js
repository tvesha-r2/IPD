const jwt = require("jsonwebtoken");
const { jwtSecret } = require("../config/env");
const User = require("../models/User");

async function authRequired(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const [, token] = header.split(" ");
    if (!token) return res.status(401).json({ error: "AuthRequired" });

    const payload = jwt.verify(token, jwtSecret);
    const user = await User.findById(payload.sub).lean();
    if (!user) return res.status(401).json({ error: "InvalidToken" });

    req.user = { id: user._id.toString(), email: user.email, name: user.name };
    next();
  } catch (err) {
    return res.status(401).json({ error: "InvalidToken" });
  }
}

module.exports = { authRequired };

