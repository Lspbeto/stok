// Histórico imutável: entregas a setores e prestação de contas ficam vinculadas.
const mongoose = require("mongoose");
const allocationSchema = new mongoose.Schema({
  type: { type: String, required: true },
  quantity: { type: Number, required: true, min: 0 },
  note: { type: String, default: "" },
  targetSector: { type: String, default: "" }
}, { _id: false });
const schema = new mongoose.Schema({
  action: { type: String, required: true },
  details: { type: String, default: "" },
  productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", default: null },
  productName: { type: String, default: "" },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  userName: { type: String, required: true },
  role: { type: String, required: true },
  sector: { type: String, default: "" },
  destination: { type: String, default: "" },
  quantity: { type: Number, default: null },
  beforeQuantity: { type: Number, default: null },
  afterQuantity: { type: Number, default: null },
  unit: { type: String, default: "" },
  allocations: { type: [allocationSchema], default: [] },
  accountedAt: { type: Date, default: null },
  accountedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  undoneAt: { type: Date, default: null },
  undoneBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  undoneByName: { type: String, default: "" },
  undoMovementId: { type: mongoose.Schema.Types.ObjectId, ref: "Movement", default: null },
  undoOf: { type: mongoose.Schema.Types.ObjectId, ref: "Movement", default: null }
}, { timestamps: true });
module.exports = mongoose.model("Movement", schema);