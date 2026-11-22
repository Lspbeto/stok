// Usuário: senha protegida por hash e setor obrigatório para operadores.
const mongoose = require("mongoose");
const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true, select: false },
  role: { type: String, enum: ["admin", "operador"], default: "operador" },
  // O setor indica onde o operador trabalha e para onde recebe materiais.
  sector: { type: String, trim: true, default: "" },
  active: { type: Boolean, default: true }
}, { timestamps: true });
module.exports = mongoose.model("User", userSchema);