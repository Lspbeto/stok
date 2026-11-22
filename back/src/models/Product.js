// Cadastro de produtos do mercadinho.
// "unit" informa como o estoque é contado; "expiryDate" registra a validade cadastrada.
const mongoose = require("mongoose");
const schema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  code: { type: String, trim: true, default: "" },
  description: { type: String, default: "" },
  quantity: { type: Number, min: 0, default: 0 },
  minimum: { type: Number, min: 0, default: 0 },
  unit: { type: String, trim: true, default: "un" },
  expiryDate: { type: Date, default: null },
  active: { type: Boolean, default: true }
}, { timestamps: true });
module.exports = mongoose.model("Product", schema);