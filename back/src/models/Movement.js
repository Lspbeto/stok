// Histórico imutável de ações e movimentações de estoque.
const mongoose = require("mongoose");
const schema = new mongoose.Schema({
  action: { type: String, required: true },
  details: { type: String, default: "" },
  productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", default: null },
  productName: { type: String, default: "" },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  userName: { type: String, required: true },
  role: { type: String, required: true },
  // Os campos abaixo permitem desfazer uma entrada/saída sem apagar o registro original.
  quantity: { type: Number, default: null },
  beforeQuantity: { type: Number, default: null },
  afterQuantity: { type: Number, default: null },
  unit: { type: String, default: "" },
  undoneAt: { type: Date, default: null },
  undoneBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  undoneByName: { type: String, default: "" },
  undoMovementId: { type: mongoose.Schema.Types.ObjectId, ref: "Movement", default: null },
  undoOf: { type: mongoose.Schema.Types.ObjectId, ref: "Movement", default: null }
}, { timestamps: true });
module.exports = mongoose.model("Movement", schema);