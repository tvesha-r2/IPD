const fs = require("node:fs");
const path = require("node:path");

const DATA_DIR = path.join(__dirname, "data");
const DATA_FILE = path.join(DATA_DIR, "data.json");

function ensureDataFile() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) {
    const initial = { categories: [], transactions: [] };
    fs.writeFileSync(DATA_FILE, JSON.stringify(initial, null, 2), "utf8");
  }
}

function readData() {
  ensureDataFile();
  const raw = fs.readFileSync(DATA_FILE, "utf8");
  const parsed = JSON.parse(raw);
  return {
    categories: Array.isArray(parsed.categories) ? parsed.categories : [],
    transactions: Array.isArray(parsed.transactions) ? parsed.transactions : [],
  };
}

function writeData(next) {
  ensureDataFile();
  fs.writeFileSync(DATA_FILE, JSON.stringify(next, null, 2), "utf8");
}

function nowIso() {
  return new Date().toISOString();
}

module.exports = {
  readData,
  writeData,
  nowIso,
};

