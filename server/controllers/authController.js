const jwt = require("jsonwebtoken");
const { jwtSecret, jwtExpiresIn } = require("../config/env");
const User = require("../models/User");

function signToken(user) {
  return jwt.sign(
    {
      sub: user._id.toString(),
      email: user.email,
    },
    jwtSecret,
    { expiresIn: jwtExpiresIn }
  );
}

exports.register = async (req, res) => {
  try {
    const { email, name, password } = req.body;
    if (!email || !name || !password) {
      return res.status(400).json({ error: "MissingFields" });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) return res.status(409).json({ error: "EmailInUse" });

    const passwordHash = await User.hashPassword(password);
    const user = await User.create({ email, name, passwordHash });
    const token = signToken(user);

    return res.status(201).json({
      token,
      user: { id: user._id.toString(), email: user.email, name: user.name },
    });
  } catch (err) {
    return res.status(500).json({ error: "ServerError" });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "MissingFields" });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(401).json({ error: "InvalidCredentials" });

    const ok = await user.verifyPassword(password);
    if (!ok) return res.status(401).json({ error: "InvalidCredentials" });

    const token = signToken(user);
    return res.json({
      token,
      user: { id: user._id.toString(), email: user.email, name: user.name },
    });
  } catch (err) {
    return res.status(500).json({ error: "ServerError" });
  }
};

