// Histórico, entradas, saídas, desfazimento e envio de relatório por e-mail.
const router = require("express").Router();
const mongoose = require("mongoose");
const nodemailer = require("nodemailer");
const Movement = require("../models/Movement");
const Product = require("../models/Product");
const { auth } = require("../middleware/auth");

function dateFilter(query) {
  const filter = {};
  if (query.from || query.to) {
    filter.createdAt = {};
    if (query.from) filter.createdAt.$gte = new Date(query.from + "T00:00:00.000Z");
    if (query.to) filter.createdAt.$lte = new Date(query.to + "T23:59:59.999Z");
  }
  return filter;
}
router.get("/", auth, async (req, res, next) => {
  try {
    const filter = dateFilter(req.query);
    if (req.user.role !== "admin") filter.userId = req.user._id;
    res.json(await Movement.find(filter).sort({ createdAt: -1 }).limit(1000));
  } catch (e) { next(e); }
});

// Envia por SMTP o mesmo histórico que o usuário tem permissão para consultar.
router.post("/email-report", auth, async (req, res, next) => {
  try {
    const email = String(req.body.email || "").trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ message: "Informe um e-mail válido." });
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
      return res.status(503).json({ message: "Configure SMTP_HOST, SMTP_USER e SMTP_PASS nas variáveis do servidor." });
    }
    const filter = dateFilter(req.body);
    if (req.user.role !== "admin") filter.userId = req.user._id;
    const items = await Movement.find(filter).sort({ createdAt: -1 }).limit(1000);
    const lines = items.map(m => [
      new Date(m.createdAt).toLocaleString("pt-BR"), m.userName, m.role, m.action,
      m.productName, m.quantity ?? "", m.unit || "", m.destination || "",
      m.sector || "", (m.allocations || []).map(a => [a.type, a.note, a.targetSector].filter(Boolean).join(" - ")).join(" | ") || m.details
    ].map(v => String(v ?? "").replace(/[\r\n;]+/g, " ")).join(";"));
    const csv = ["Data;Usuário;Perfil;Ação;Produto;Quantidade;Unidade;Destinação;Setor;Observação / justificativa", ...lines].join("\n");
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT || 465),
      secure: String(process.env.SMTP_SECURE || "true") === "true",
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    });
    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER, to: email,
      subject: "STOK - Relatório de movimentações",
      text: "Segue em anexo o relatório de movimentações do estoque.",
      attachments: [{ filename: "relatorio-movimentacoes.csv", content: "\uFEFF" + csv, contentType: "text/csv; charset=utf-8" }]
    });
    res.json({ message: "Relatório enviado para " + email + "." });
  } catch (e) { next(e); }
});

// Registra entrada ou saída e guarda saldo anterior e novo saldo.
router.post("/stock", auth, async (req, res, next) => {
  try {
    const { productId, type, quantity, reason } = req.body;
    const amount = Number(quantity);
    if (!mongoose.isValidObjectId(productId)) return res.status(400).json({ message: "Produto inválido." });
    if (!["ENTRADA", "SAIDA"].includes(type)) return res.status(400).json({ message: "Tipo deve ser ENTRADA ou SAIDA." });
    if (!Number.isFinite(amount) || amount <= 0) return res.status(400).json({ message: "Informe quantidade maior que zero." });
    const product = await Product.findOne({ _id: productId, active: true });
    if (!product) return res.status(404).json({ message: "Produto não encontrado." });
    const before = product.quantity, after = type === "ENTRADA" ? before + amount : before - amount;
    if (after < 0) return res.status(400).json({ message: "Estoque insuficiente para essa saída." });
    product.quantity = after;
    if (type === "SAIDA") product.lastExitDate = new Date();
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

// Reverte entrada/saída com registro inverso. Nunca remove o histórico original.
router.post("/:id/undo", auth, async (req, res, next) => {
  try {
    const original = await Movement.findById(req.params.id);
    if (!original || !["ENTRADA", "SAIDA"].includes(original.action)) return res.status(404).json({ message: "Movimentação não encontrada ou não pode ser desfeita." });
    if (original.undoneAt) return res.status(409).json({ message: "Essa movimentação já foi desfeita." });
    if (req.user.role !== "admin" && String(original.userId) !== String(req.user._id)) return res.status(403).json({ message: "Você só pode desfazer suas próprias movimentações." });
    const product = await Product.findOne({ _id: original.productId, active: true });
    if (!product) return res.status(404).json({ message: "Produto não encontrado ou inativo." });
    const before = product.quantity, after = original.action === "ENTRADA" ? before - original.quantity : before + original.quantity;
    if (after < 0) return res.status(409).json({ message: "Não é possível desfazer: o estoque atual não permite essa reversão." });
    product.quantity = after; await product.save();
    const reversal = await Movement.create({
      action: "DESFAZIMENTO", details: (req.body.reason || "Desfazimento") + " (movimentação " + original._id + ")",
      productId: product._id, productName: product.name, userId: req.user._id,
      userName: req.user.name, role: req.user.role, quantity: original.quantity,
      beforeQuantity: before, afterQuantity: after, unit: product.unit, undoOf: original._id
    });
    original.undoneAt = new Date(); original.undoneBy = req.user._id;
    original.undoneByName = req.user.name; original.undoMovementId = reversal._id;
    await original.save();
    res.json({ message: "Movimentação desfeita e registrada no histórico.", product, movement: reversal });
  } catch (e) { next(e); }
});
module.exports = router;