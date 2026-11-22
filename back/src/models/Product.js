// Cadastro de produtos. O campo active permite excluir sem apagar o histórico.
const mongoose = require("mongoose");
const schema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  code: { type: String, trim: true, default: "" },
  description: { type: String, default: "" },
  quantity: { type: Number, min: 0, default: 0 },
  minimum: { type: Number, min: 0, default: 0 },
  active: { type: Boolean, default: true }
}, { timestamps: true });
module.exports = mongoose.model("Product", schema);