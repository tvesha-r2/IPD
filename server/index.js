const path = require("node:path");

const cors = require("cors");
const express = require("express");
const { nanoid } = require("nanoid");

const { nowIso, readData, writeData } = require("./store");
const {
  CategoryCreateSchema,
  CategoryPatchSchema,
  TransactionCreateSchema,
  TransactionPatchSchema,
  parseQueryInt,
} = require("./validate");

const app = express();

app.use(cors());
app.use(express.json({ limit: "256kb" }));

// Serve your existing frontend too (optional but handy).
app.use(express.static(path.join(__dirname, "..")));

app.get("/api/health", (req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

function sendZodError(res, error) {
  return res.status(400).json({
    error: "ValidationError",
    details: error.issues.map((i) => ({
      path: i.path.join("."),
      message: i.message,
    })),
  });
}

// ---- Categories ----
app.get("/api/categories", (req, res) => {
  const { categories } = readData();
  res.json({ categories });
});

app.post("/api/categories", (req, res) => {
  const parsed = CategoryCreateSchema.safeParse(req.body);
  if (!parsed.success) return sendZodError(res, parsed.error);

  const data = readData();
  const createdAt = nowIso();
  const category = {
    id: nanoid(),
    name: parsed.data.name,
    icon: parsed.data.icon ?? null,
    color: parsed.data.color ?? null,
    createdAt,
    updatedAt: createdAt,
  };

  data.categories.push(category);
  writeData(data);
  res.status(201).json({ category });
});

app.get("/api/categories/:id", (req, res) => {
  const { categories } = readData();
  const category = categories.find((c) => c.id === req.params.id);
  if (!category) return res.status(404).json({ error: "NotFound" });
  res.json({ category });
});

app.patch("/api/categories/:id", (req, res) => {
  const parsed = CategoryPatchSchema.safeParse(req.body);
  if (!parsed.success) return sendZodError(res, parsed.error);

  const data = readData();
  const idx = data.categories.findIndex((c) => c.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: "NotFound" });

  const prev = data.categories[idx];
  const updated = {
    ...prev,
    ...parsed.data,
    icon: parsed.data.icon === undefined ? prev.icon : parsed.data.icon ?? null,
    color: parsed.data.color === undefined ? prev.color : parsed.data.color ?? null,
    updatedAt: nowIso(),
  };

  data.categories[idx] = updated;
  writeData(data);
  res.json({ category: updated });
});

app.delete("/api/categories/:id", (req, res) => {
  const data = readData();
  const before = data.categories.length;
  data.categories = data.categories.filter((c) => c.id !== req.params.id);
  if (data.categories.length === before) return res.status(404).json({ error: "NotFound" });

  // keep transactions, but null out categoryId for deleted category
  data.transactions = data.transactions.map((t) =>
    t.categoryId === req.params.id ? { ...t, categoryId: null, updatedAt: nowIso() } : t
  );

  writeData(data);
  res.status(204).send();
});

// ---- Transactions ----
app.get("/api/transactions", (req, res) => {
  const data = readData();

  const categoryId = typeof req.query.categoryId === "string" ? req.query.categoryId : undefined;
  const type = req.query.type === "income" || req.query.type === "expense" ? req.query.type : undefined;
  const from = typeof req.query.from === "string" ? Date.parse(req.query.from) : NaN;
  const to = typeof req.query.to === "string" ? Date.parse(req.query.to) : NaN;
  const limit = parseQueryInt(req.query.limit, 50);
  const offset = parseQueryInt(req.query.offset, 0);
  const sort = typeof req.query.sort === "string" ? req.query.sort : "-occurredAt";

  let items = data.transactions.slice();

  if (categoryId) items = items.filter((t) => t.categoryId === categoryId);
  if (type) items = items.filter((t) => t.type === type);
  if (!Number.isNaN(from)) items = items.filter((t) => Date.parse(t.occurredAt) >= from);
  if (!Number.isNaN(to)) items = items.filter((t) => Date.parse(t.occurredAt) <= to);

  const desc = sort.startsWith("-");
  const key = desc ? sort.slice(1) : sort;
  if (key === "occurredAt" || key === "amount" || key === "createdAt") {
    items.sort((a, b) => {
      const av = key === "amount" ? a.amount : Date.parse(a[key]);
      const bv = key === "amount" ? b.amount : Date.parse(b[key]);
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return desc ? -cmp : cmp;
    });
  }

  const total = items.length;
  const paged = items.slice(offset, offset + limit);

  res.json({ transactions: paged, total, limit, offset });
});

app.post("/api/transactions", (req, res) => {
  const parsed = TransactionCreateSchema.safeParse(req.body);
  if (!parsed.success) return sendZodError(res, parsed.error);

  const data = readData();

  if (parsed.data.categoryId) {
    const exists = data.categories.some((c) => c.id === parsed.data.categoryId);
    if (!exists) return res.status(400).json({ error: "UnknownCategory" });
  }

  const createdAt = nowIso();
  const occurredAt = parsed.data.occurredAt ?? createdAt;

  const tx = {
    id: nanoid(),
    amount: parsed.data.amount,
    type: parsed.data.type,
    currency: parsed.data.currency ?? "INR",
    categoryId: parsed.data.categoryId ?? null,
    note: parsed.data.note ?? null,
    occurredAt,
    createdAt,
    updatedAt: createdAt,
  };

  data.transactions.push(tx);
  writeData(data);
  res.status(201).json({ transaction: tx });
});

app.get("/api/transactions/:id", (req, res) => {
  const { transactions } = readData();
  const transaction = transactions.find((t) => t.id === req.params.id);
  if (!transaction) return res.status(404).json({ error: "NotFound" });
  res.json({ transaction });
});

app.patch("/api/transactions/:id", (req, res) => {
  const parsed = TransactionPatchSchema.safeParse(req.body);
  if (!parsed.success) return sendZodError(res, parsed.error);

  const data = readData();
  const idx = data.transactions.findIndex((t) => t.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: "NotFound" });

  if (parsed.data.categoryId !== undefined && parsed.data.categoryId !== null) {
    const exists = data.categories.some((c) => c.id === parsed.data.categoryId);
    if (!exists) return res.status(400).json({ error: "UnknownCategory" });
  }

  const prev = data.transactions[idx];
  const next = {
    ...prev,
    ...parsed.data,
    currency: parsed.data.currency === undefined ? prev.currency : parsed.data.currency,
    categoryId:
      parsed.data.categoryId === undefined ? prev.categoryId : parsed.data.categoryId ?? null,
    note: parsed.data.note === undefined ? prev.note : parsed.data.note ?? null,
    occurredAt: parsed.data.occurredAt === undefined ? prev.occurredAt : parsed.data.occurredAt,
    updatedAt: nowIso(),
  };

  data.transactions[idx] = next;
  writeData(data);
  res.json({ transaction: next });
});

app.delete("/api/transactions/:id", (req, res) => {
  const data = readData();
  const before = data.transactions.length;
  data.transactions = data.transactions.filter((t) => t.id !== req.params.id);
  if (data.transactions.length === before) return res.status(404).json({ error: "NotFound" });
  writeData(data);
  res.status(204).send();
});

// ---- Simple summary ----
app.get("/api/summary", (req, res) => {
  const data = readData();
  const from = typeof req.query.from === "string" ? Date.parse(req.query.from) : NaN;
  const to = typeof req.query.to === "string" ? Date.parse(req.query.to) : NaN;

  let items = data.transactions.slice();
  if (!Number.isNaN(from)) items = items.filter((t) => Date.parse(t.occurredAt) >= from);
  if (!Number.isNaN(to)) items = items.filter((t) => Date.parse(t.occurredAt) <= to);

  const totals = { income: 0, expense: 0, net: 0 };
  const byCategory = {};

  items.forEach((t) => {
    if (t.type === "income") totals.income += t.amount;
    if (t.type === "expense") totals.expense += t.amount;

    const key = t.categoryId ?? "uncategorized";
    byCategory[key] ??= { income: 0, expense: 0, net: 0 };
    if (t.type === "income") byCategory[key].income += t.amount;
    if (t.type === "expense") byCategory[key].expense += t.amount;
    byCategory[key].net = byCategory[key].income - byCategory[key].expense;
  });

  totals.net = totals.income - totals.expense;

  res.json({
    totals,
    byCategory,
    count: items.length,
  });
});

// Frontend SPA-ish fallback (so / works when API is running).
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "index.html"));
});

const port = Number(process.env.PORT || 5050);
app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`API listening on http://127.0.0.1:${port}`);
});

