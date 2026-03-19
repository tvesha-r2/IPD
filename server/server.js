const path = require("node:path");
const express = require("express");
const cors = require("cors");

const { connectMongo } = require("./config/db");
const { port } = require("./config/env");

const authRoutes = require("./routes/authRoutes");
const categoryRoutes = require("./routes/categoryRoutes");
const transactionRoutes = require("./routes/transactionRoutes");

async function main() {
  await connectMongo();

  const app = express();

  app.use(cors());
  app.use(express.json({ limit: "512kb" }));

  // Serve frontend
  app.use(express.static(path.join(__dirname, "..")));

  app.get("/api/health", (req, res) => {
    res.json({ ok: true, time: new Date().toISOString() });
  });

  app.use("/api/auth", authRoutes);
  app.use("/api/categories", categoryRoutes);
  app.use("/api/transactions", transactionRoutes);

  // SPA fallback
  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "..", "index.html"));
  });

  app.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`API listening on http://127.0.0.1:${port}`);
  });
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("Failed to start server", err);
  process.exit(1);
});

