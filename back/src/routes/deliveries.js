// Entregas a setores e prestação de contas. Registros de destino são lançados como novos movimentos.
const router = require("express").Router();
const mongoose = require("mongoose");
const Product = require("../models/Product");
const Movement = require("../models/Movement");
const { auth, adminOnly, isGeneralAdmin } = require("../middleware/auth");
const scope = req => isGeneralAdmin(req.user) ? {} : { companyId: req.user.companyId || null };
router.use(auth);
const TYPES = ["DEVOLUCAO", "CONSUMO", "EXTRAVIO", "DOACAO", "VENDA", "TRANSFERENCIA", "OUTRO"];
const actor = (u) => ({ userId: u._id, userName: u.name, role: u.role, sector: u.sector || "" });
async function totalAccounted(id) {
  const rows = await Movement.find({ undoOf: id, action: "DESTINACAO" });
  return rows.reduce((sum, row) => sum + Number(row.quantity || 0), 0);
}
router.get("/", async (req, res, next) => {
  try {
    const filter = { ...scope(req), action: { $in: ["ENTREGA_SETOR", "ENTREGA_BEM"] } };
    if (req.user.role === "operador" || req.user.role === "adm_setor") filter.sector = req.user.sector;
    const deliveries = await Movement.find(filter).sort({ createdAt: -1 }).lean();
    const result = await Promise.all(deliveries.map(async d => {
      const isAsset = d.action === "ENTREGA_BEM";
      const entries = isAsset ? [] : await Movement.find({ undoOf: d._id, action: "DESTINACAO" }).sort({ createdAt: 1 }).lean();
      const closed = isAsset || !!(await Movement.exists({ undoOf: d._id, action: "FECHAMENTO_PRESTACAO" }));
      const product = isAsset ? await Product.findOne({ ...scope(req), _id: d.productId }).lean() : null;
      return { ...d, isAsset, patrimonyCode: product?.patrimonyCode || "", condition: product?.condition || "", entries, accounted: entries.reduce((s,x)=>s+Number(x.quantity||0),0), closed };
    }));
    res.json(result);
  } catch (e) { next(e); }
});
router.post("/", adminOnly, async (req, res, next) => {
  try {
    const { productId, quantity, sector } = req.body;
    const amount = Number(quantity);
    if (!mongoose.isValidObjectId(productId) || !Number.isFinite(amount) || amount <= 0 || !String(sector || "").trim()) return res.status(400).json({ message: "Informe produto, quantidade positiva e setor." });
    const targetSector = String(sector).trim();
    // Bem permanente é individual: não baixa quantidade de consumo. A entrega
    // apenas muda a responsabilidade patrimonial para o setor informado.
    const existing = await Product.findOne({ ...scope(req), _id: productId, active: true });
    if (!existing) return res.status(404).json({ message: "Item não encontrado ou inativo." });
    let product, row;
    if (existing.category === "BEM") {
      if (amount !== 1) return res.status(400).json({ message: "Bem permanente é controlado individualmente. Informe quantidade 1." });
      if (existing.lastExitDate) return res.status(409).json({ message: "Este bem possui saída definitiva registrada e não pode ser entregue." });
      product = await Product.findOneAndUpdate(
        { ...scope(req), _id: productId, active: true, category: "BEM", lastExitDate: null },
        { $set: { responsibleSector: targetSector, lastSectorExitDate: new Date() } },
        { new: true }
      );
      if (!product) return res.status(409).json({ message: "Não foi possível atualizar a responsabilidade deste bem." });
      row = await Movement.create({
        action: "ENTREGA_BEM", details: "Entrega patrimonial ao setor " + targetSector,
        productId: product._id, productName: product.name, quantity: 1, unit: "un",
        sector: targetSector, destination: "RESPONSABILIDADE_PATRIMONIAL",
        beforeQuantity: 1, afterQuantity: 1, ...actor(req.user)
      });
    } else {
      product = await Product.findOneAndUpdate(
        { ...scope(req), _id: productId, active: true, category: { $ne: "BEM" }, quantity: { $gte: amount } },
        { $inc: { quantity: -amount }, $set: { lastExitDate: new Date() } },
        { new: true }
      );
      if (!product) return res.status(400).json({ message: "Produto inexistente, inativo ou estoque insuficiente." });
      row = await Movement.create({
        action: "ENTREGA_SETOR", details: "Entrega de estoque ao setor " + targetSector,
        productId: product._id, productName: product.name, quantity: amount, unit: product.unit,
        beforeQuantity: product.quantity + amount, afterQuantity: product.quantity,
        sector: targetSector, ...actor(req.user)
      });
    }
    res.status(201).json(row);
  } catch (e) { next(e); }
});
router.post("/:id/account", async (req, res, next) => {
  try {
    const delivery = await Movement.findOne({ ...scope(req), _id: req.params.id, action: "ENTREGA_SETOR" });
    if (!delivery) return res.status(404).json({ message: "Entrega não encontrada." });
    if (req.user.role !== "admin" && req.user.sector !== delivery.sector) return res.status(403).json({ message: "Esta entrega pertence a outro setor." });
    if (await Movement.exists({ undoOf: delivery._id, action: "FECHAMENTO_PRESTACAO" })) return res.status(409).json({ message: "Prestação já encerrada. Faça um ajuste rastreável com o administrador." });
    const type = String(req.body.type || "").toUpperCase(), amount = Number(req.body.quantity), note = String(req.body.note || "").trim();
    if (!TYPES.includes(type) || !Number.isFinite(amount) || amount <= 0) return res.status(400).json({ message: "Tipo de destino e quantidade positiva são obrigatórios." });
    if (!note) return res.status(400).json({ message: "Informe uma observação que justifique o que aconteceu com o item recebido." });
    if (type === "TRANSFERENCIA" && !String(req.body.targetSector || "").trim()) return res.status(400).json({ message: "Informe o setor que recebeu a transferência." });
    const accounted = await totalAccounted(delivery._id);
    if (accounted + amount > delivery.quantity) return res.status(400).json({ message: "Quantidade excede o saldo ainda não prestado." });
    // Registra quando o item deixa a guarda do setor (devolução, consumo, transferência etc.).
    await Product.updateOne({ ...scope(req), _id: delivery.productId }, { $set: { lastSectorExitDate: new Date() } });
    if (type === "DEVOLUCAO") {
      const updated = await Product.findOneAndUpdate({ ...scope(req), _id: delivery.productId }, { $inc: { quantity: amount } }, { new: true });
      if (!updated) return res.status(409).json({ message: "Produto não encontrado para registrar a devolução." });
    }
    const row = await Movement.create({ companyId: delivery.companyId, action: "DESTINACAO", details: note || type, productId: delivery.productId, productName: delivery.productName, quantity: amount, unit: delivery.unit, sector: delivery.sector, destination: type, allocations: [{ type, quantity: amount, note, targetSector: String(req.body.targetSector || "") }], undoOf: delivery._id, ...actor(req.user) });
    // A transferência cria uma nova responsabilidade para o setor destino, sem retornar ao estoque.
    if (type === "TRANSFERENCIA") {
      await Movement.create({ action: "ENTREGA_SETOR", details: "Transferência recebida do setor " + delivery.sector, productId: delivery.productId, productName: delivery.productName, quantity: amount, unit: delivery.unit, sector: String(req.body.targetSector).trim(), ...actor(req.user) });
    }
    res.status(201).json({ entry: row, totalAccounted: accounted + amount, remaining: delivery.quantity - accounted - amount });
  } catch (e) { next(e); }
});
router.post("/:id/close", async (req, res, next) => {
  try {
    const delivery = await Movement.findOne({ ...scope(req), _id: req.params.id, action: "ENTREGA_SETOR" });
    if (!delivery) return res.status(404).json({ message: "Entrega não encontrada." });
    if (req.user.role !== "admin" && req.user.sector !== delivery.sector) return res.status(403).json({ message: "Esta entrega pertence a outro setor." });
    if (await Movement.exists({ undoOf: delivery._id, action: "FECHAMENTO_PRESTACAO" })) return res.status(409).json({ message: "Prestação já encerrada." });
    const total = await totalAccounted(delivery._id);
    if (total !== Number(delivery.quantity)) return res.status(400).json({ message: "Não é possível concluir: destinos somam " + total + " de " + delivery.quantity + " " + delivery.unit + "." });
    const row = await Movement.create({ action: "FECHAMENTO_PRESTACAO", details: "Prestação de contas concluída.", productId: delivery.productId, productName: delivery.productName, quantity: total, unit: delivery.unit, sector: delivery.sector, undoOf: delivery._id, ...actor(req.user) });
    res.status(201).json({ message: "Prestação de contas concluída.", record: row });
  } catch (e) { next(e); }
});
module.exports = router;