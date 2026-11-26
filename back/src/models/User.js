// Usuário: senha protegida por hash e vínculo obrigatório à empresa após migração.
const mongoose = require("mongoose");
const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  displayName: { type: String, trim: true, default: "" },
  loginName: { type: String, trim: true, lowercase: true, unique: true, sparse: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true, select: false },
  registrationNumber: { type: String, trim: true, default: "", index: true },
  isFictional: { type: Boolean, default: false, index: true },
  role: { type: String, enum: ["admin", "adm_geral", "adm_empresa", "adm_setor", "operador"], default: "operador" },
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", default: null, index: true },
  sector: { type: String, trim: true, default: "" },
  active: { type: Boolean, default: true },
  passwordResetTokenHash: { type: String, default: null, select: false },
  passwordResetExpires: { type: Date, default: null, select: false },
  firstAccessCodeHash: { type: String, default: null, select: false },
  firstAccessCodeExpires: { type: Date, default: null, select: false },
  firstAccessCodeSentAt: { type: Date, default: null, select: false }
}, { timestamps: true });
module.exports = mongoose.model("User", userSchema);
