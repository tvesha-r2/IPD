const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true, trim: true },
    icon: { type: String, trim: true },
    color: { type: String, trim: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Category", categorySchema);

