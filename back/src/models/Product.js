// Cadastro de mercadorias e bens permanentes.
const mongoose = require("mongoose");
const schema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  code: { type: String, trim: true, default: "" },
  description: { type: String, default: "" },
  category: { type: String, enum: ["MERCADORIA", "BEM"], default: "MERCADORIA" },
  patrimonyCode: { type: String, trim: true, default: "" },
  condition: { type: String, trim: true, default: "" },
  // Setor que atualmente responde pelo bem patrimonial.
  responsibleSector: { type: String, trim: true, default: "" },
  entryDate: { type: Date, default: null },
  lastExitDate: { type: Date, default: null }, // Última saída registrada diretamente do estoque.
  lastSectorExitDate: { type: Date, default: null }, // Última saída ou transferência registrada pelo setor.
  quantity: { type: Number, min: 0, default: 0 },
  minimum: { type: Number, min: 0, default: 0 },
  unit: { type: String, trim: true, default: "un" },
  expiryDate: { type: Date, default: null },
  active: { type: Boolean, default: true }
}, { timestamps: true });
module.exports = mongoose.model("Product", schema);