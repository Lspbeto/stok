// Cadastro de empresas. CNPJ 0000000000 identifica ambiente/empresa fictícia.
const mongoose = require("mongoose");
const schema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  cnpj: { type: String, required: true, trim: true },
  isFictional: { type: Boolean, default: false, index: true },
  active: { type: Boolean, default: true, index: true }
}, { timestamps: true });
module.exports = mongoose.model("Company", schema);
