// Histórico de ações: guarda quem fez, o que fez e quando fez.
const mongoose = require("mongoose");
const schema = new mongoose.Schema({
  action: { type: String, required: true },
  details: { type: String, default: "" },
  productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", default: null },
  productName: { type: String, default: "" },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  userName: { type: String, required: true },
  role: { type: String, required: true }
}, { timestamps: true });
module.exports = mongoose.model("Movement", schema);