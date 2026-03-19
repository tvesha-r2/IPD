const path = require("node:path");
const dotenv = require("dotenv");

dotenv.config({ path: path.join(__dirname, "..", "..", ".env") });

const required = (value, name) => {
  if (!value) {
    throw new Error(`Missing required env var ${name}`);
  }
  return value;
};

module.exports = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT || 5050),
  mongoUri: required(process.env.MONGO_URI, "MONGO_URI"),
  jwtSecret: required(process.env.JWT_SECRET, "JWT_SECRET"),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
};

