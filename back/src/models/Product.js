// Cadastro de mercadorias e bens permanentes, sempre pertencentes a uma empresa.
const mongoose = require("mongoose");
const schema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", default: null, index: true },
  code: { type: String, trim: true, default: "" },
  isFictional: { type: Boolean, default: false, index: true },
  description: { type: String, default: "" },
  category: { type: String, enum: ["MERCADORIA", "BEM"], default: "MERCADORIA" },
  patrimonyCode: { type: String, trim: true, default: "" },
  condition: { type: String, trim: true, default: "" },
  responsibleSector: { type: String, trim: true, default: "" },
  entryDate: { type: Date, default: null },
  lastExitDate: { type: Date, default: null },
  lastSectorExitDate: { type: Date, default: null },
  quantity: { type: Number, min: 0, default: 0 },
  minimum: { type: Number, min: 0, default: 0 },
  unit: { type: String, trim: true, default: "un" },
  expiryDate: { type: Date, default: null },
  active: { type: Boolean, default: true }
}, { timestamps: true });
module.exports = mongoose.model("Product", schema);
