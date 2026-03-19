const Transaction = require("../models/Transaction");
const Category = require("../models/Category");

exports.list = async (req, res) => {
  const { categoryId, type, from, to, limit = 50, offset = 0 } = req.query;

  const query = { user: req.user.id };
  if (categoryId) query.category = categoryId;
  if (type === "income" || type === "expense") query.type = type;

  if (from || to) {
    query.occurredAt = {};
    if (from) query.occurredAt.$gte = new Date(from);
    if (to) query.occurredAt.$lte = new Date(to);
  }

  const [items, total] = await Promise.all([
    Transaction.find(query)
      .sort({ occurredAt: -1 })
      .skip(Number(offset))
      .limit(Math.min(Number(limit), 200))
      .lean(),
    Transaction.countDocuments(query),
  ]);

  return res.json({ transactions: items, total });
};

exports.create = async (req, res) => {
  const { amount, type, categoryId, note, currency, occurredAt } = req.body;
  if (typeof amount !== "number" || !["income", "expense"].includes(type)) {
    return res.status(400).json({ error: "InvalidPayload" });
  }

  let category = null;
  if (categoryId) {
    category = await Category.findOne({ _id: categoryId, user: req.user.id });
    if (!category) return res.status(400).json({ error: "UnknownCategory" });
  }

  const tx = await Transaction.create({
    user: req.user.id,
    amount,
    type,
    category: category ? category._id : undefined,
    note,
    currency: currency || "INR",
    occurredAt: occurredAt ? new Date(occurredAt) : undefined,
  });

  return res.status(201).json({ transaction: tx });
};

exports.getOne = async (req, res) => {
  const tx = await Transaction.findOne({ _id: req.params.id, user: req.user.id }).lean();
  if (!tx) return res.status(404).json({ error: "NotFound" });
  return res.json({ transaction: tx });
};

exports.update = async (req, res) => {
  const { amount, type, categoryId, note, currency, occurredAt } = req.body;

  const update = {};
  if (amount !== undefined) update.amount = amount;
  if (type !== undefined) update.type = type;
  if (note !== undefined) update.note = note;
  if (currency !== undefined) update.currency = currency;
  if (occurredAt !== undefined) update.occurredAt = new Date(occurredAt);

  if (categoryId !== undefined) {
    if (!categoryId) {
      update.$unset = { category: "" };
    } else {
      const category = await Category.findOne({ _id: categoryId, user: req.user.id });
      if (!category) return res.status(400).json({ error: "UnknownCategory" });
      update.category = category._id;
    }
  }

  const tx = await Transaction.findOneAndUpdate(
    { _id: req.params.id, user: req.user.id },
    update,
    { new: true }
  ).lean();

  if (!tx) return res.status(404).json({ error: "NotFound" });
  return res.json({ transaction: tx });
};

exports.remove = async (req, res) => {
  const tx = await Transaction.findOneAndDelete({ _id: req.params.id, user: req.user.id });
  if (!tx) return res.status(404).json({ error: "NotFound" });
  return res.status(204).send();
};

exports.summary = async (req, res) => {
  const { from, to } = req.query;
  const match = { user: req.user.id };

  if (from || to) {
    match.occurredAt = {};
    if (from) match.occurredAt.$gte = new Date(from);
    if (to) match.occurredAt.$lte = new Date(to);
  }

  const agg = await Transaction.aggregate([
    { $match: match },
    {
      $group: {
        _id: { type: "$type" },
        total: { $sum: "$amount" },
        count: { $sum: 1 },
      },
    },
  ]);

  const totals = { income: 0, expense: 0, net: 0 };
  agg.forEach((row) => {
    if (row._id.type === "income") totals.income = row.total;
    if (row._id.type === "expense") totals.expense = row.total;
  });
  totals.net = totals.income - totals.expense;

  return res.json({ totals });
};

