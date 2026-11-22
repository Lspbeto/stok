// Histórico, entradas, saídas e desfazimento de movimentações.
const router = require("express").Router();
const mongoose = require("mongoose");
const Movement = require("../models/Movement");
const Product = require("../models/Product");
const { auth, adminOnly } = require("../middleware/auth");

router.get("/", auth, async (req, res, next) => {
  try {
    const filter = {};
    if (req.user.role !== "admin") filter.userId = req.user._id;
    if (req.query.from || req.query.to) {
      filter.createdAt = {};
      if (req.query.from) filter.createdAt.$gte = new Date(req.query.from + "T00:00:00.000Z");
      if (req.query.to) filter.createdAt.$lte = new Date(req.query.to + "T23:59:59.999Z");
    }
    const items = await Movement.find(filter).sort({ createdAt: -1 }).limit(1000);
    res.json(items);
  } catch (e) { next(e); }
});

// Registra entrada ou saída e guarda o saldo anterior e o novo saldo.
router.post("/stock", auth, async (req, res, next) => {
  try {
    const { productId, type, quantity, reason } = req.body;
    const amount = Number(quantity);
    if (!mongoose.isValidObjectId(productId)) return res.status(400).json({ message: "Produto inválido." });
    if (!["ENTRADA", "SAIDA"].includes(type)) return res.status(400).json({ message: "Tipo deve ser ENTRADA ou SAIDA." });
    if (!Number.isFinite(amount) || amount <= 0) return res.status(400).json({ message: "Informe uma quantidade maior que zero." });
    const product = await Product.findOne({ _id: productId, active: true });
    if (!product) return res.status(404).json({ message: "Produto não encontrado." });
    const before = product.quantity;
    const after = type === "ENTRADA" ? before + amount : before - amount;
    if (after < 0) return res.status(400).json({ message: "Estoque insuficiente para essa saída." });
    product.quantity = after;
    await product.save();
    const movement = await Movement.create({
      action: type, details: reason || (type === "ENTRADA" ? "Entrada de estoque." : "Saída de estoque."),
      productId: product._id, productName: product.name, userId: req.user._id,
      userName: req.user.name, role: req.user.role, quantity: amount,
      beforeQuantity: before, afterQuantity: after, unit: product.unit
    });
    res.status(201).json({ product, movement });
  } catch (e) { next(e); }
});

// Desfaz uma entrada/saída criando um movimento inverso. Nunca apaga o histórico original.
router.post("/:id/undo", auth, async (req, res, next) => {
  try {
    const original = await Movement.findById(req.params.id);
    if (!original || !["ENTRADA", "SAIDA"].includes(original.action)) return res.status(404).json({ message: "Movimentação não encontrada ou não pode ser desfeita." });
    if (original.undoneAt) return res.status(409).json({ message: "Essa movimentação já foi desfeita." });
    if (req.user.role !== "admin" && String(original.userId) !== String(req.user._id)) return res.status(403).json({ message: "Você só pode desfazer suas próprias movimentações." });
    const product = await Product.findOne({ _id: original.productId, active: true });
    if (!product) return res.status(404).json({ message: "Produto não encontrado ou inativo." });
    const before = product.quantity;
    const after = original.action === "ENTRADA" ? before - original.quantity : before + original.quantity;
    if (after < 0) return res.status(409).json({ message: "Não é possível desfazer: o estoque atual não permite essa reversão." });
    product.quantity = after;
    await product.save();
    const reversal = await Movement.create({
      action: "DESFAZIMENTO", details: req.body.reason || ("Desfazimento da movimentação " + original._id),
      productId: product._id, productName: product.name, userId: req.user._id,
      userName: req.user.name, role: req.user.role, quantity: original.quantity,
      beforeQuantity: before, afterQuantity: after, unit: product.unit, undoOf: original._id
    });
    original.undoneAt = new Date();
    original.undoneBy = req.user._id;
    original.undoneByName = req.user.name;
    original.undoMovementId = reversal._id;
    await original.save();
    res.json({ message: "Movimentação desfeita e registrada no histórico.", product, movement: reversal });
  } catch (e) { next(e); }
});
module.exports = router;