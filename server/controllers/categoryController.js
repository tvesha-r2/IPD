const Category = require("../models/Category");
const Transaction = require("../models/Transaction");

exports.list = async (req, res) => {
  const categories = await Category.find({ user: req.user.id }).sort({ createdAt: 1 }).lean();
  return res.json({ categories });
};

exports.create = async (req, res) => {
  const { name, icon, color } = req.body;
  if (!name) return res.status(400).json({ error: "NameRequired" });

  const category = await Category.create({
    user: req.user.id,
    name,
    icon,
    color,
  });

  return res.status(201).json({ category });
};

exports.getOne = async (req, res) => {
  const category = await Category.findOne({ _id: req.params.id, user: req.user.id }).lean();
  if (!category) return res.status(404).json({ error: "NotFound" });
  return res.json({ category });
};

exports.update = async (req, res) => {
  const { name, icon, color } = req.body;
  const category = await Category.findOneAndUpdate(
    { _id: req.params.id, user: req.user.id },
    { $set: { ...(name !== undefined && { name }), icon, color } },
    { new: true }
  ).lean();
  if (!category) return res.status(404).json({ error: "NotFound" });
  return res.json({ category });
};

exports.remove = async (req, res) => {
  const category = await Category.findOneAndDelete({ _id: req.params.id, user: req.user.id });
  if (!category) return res.status(404).json({ error: "NotFound" });

  await Transaction.updateMany(
    { user: req.user.id, category: category._id },
    { $unset: { category: "" } }
  );

  return res.status(204).send();
};

