const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    category: { type: mongoose.Schema.Types.ObjectId, ref: "Category" },
    amount: { type: Number, required: true },
    type: { type: String, enum: ["income", "expense"], required: true },
    currency: { type: String, default: "INR" },
    note: { type: String, trim: true },
    occurredAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Transaction", transactionSchema);

