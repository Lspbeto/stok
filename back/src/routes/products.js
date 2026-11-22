// Cadastro e manutenção de produtos e bens. Exclusões são lógicas para preservar o histórico.
const router = require("express").Router();
const Product = require("../models/Product");
const Movement = require("../models/Movement");
const { auth, adminOnly } = require("../middleware/auth");
router.use(auth);
async function log(req, action, product, details) {
  await Movement.create({ action, details, productId: product?._id || null, productName: product?.name || "", userId: req.user._id, userName: req.user.name, role: req.user.role });
}
router.get("/", async (_req, res, next) => {
  try { res.json(await Product.find({ active: true }).sort({ name: 1 })); } catch (e) { next(e); }
});
router.post("/", async (req, res, next) => {
  try {
    const { name, code, description, quantity, minimum, unit, expiryDate, category, patrimonyCode, condition, responsibleSector } = req.body;
    if (!name) return res.status(400).json({ message: "O nome do item é obrigatório." });
    const type = category === "BEM" ? "BEM" : "MERCADORIA";
    if (type === "BEM" && !String(patrimonyCode || "").trim()) return res.status(400).json({ message: "Informe o número de patrimônio do bem." });
    if (type === "BEM" && !String(responsibleSector || "").trim()) return res.status(400).json({ message: "Informe o setor responsável pelo bem." });
    if (type === "BEM" && await Product.exists({ patrimonyCode: String(patrimonyCode).trim(), active: true })) return res.status(409).json({ message: "Este número de patrimônio já está cadastrado." });
    const product = await Product.create({ name, code, description, category: type, patrimonyCode, condition, responsibleSector: String(responsibleSector || "").trim(), quantity: type === "BEM" ? 1 : Number(quantity || 0), minimum: Number(minimum || 0), unit: unit || "un", expiryDate: expiryDate || null });
    await log(req, "PRODUTO_CRIADO", product, "Item cadastrado: " + type + ".");
    res.status(201).json(product);
  } catch (e) { next(e); }
});
router.put("/:id", async (req, res, next) => {
  try {
    const allowed = ["name", "code", "description", "minimum", "unit", "expiryDate", "category", "patrimonyCode", "condition", "responsibleSector"];
    const updates = {};
    allowed.forEach(key => { if (req.body[key] !== undefined) updates[key] = req.body[key]; });
    const product = await Product.findOneAndUpdate({ _id: req.params.id, active: true }, updates, { new: true, runValidators: true });
    if (!product) return res.status(404).json({ message: "Item não encontrado." });
    await log(req, "PRODUTO_EDITADO", product, "Dados do item alterados.");
    res.json(product);
  } catch (e) { next(e); }
});
router.delete("/:id", async (req, res, next) => {
  try {
    const product = await Product.findOneAndUpdate({ _id: req.params.id, active: true }, { active: false }, { new: true });
    if (!product) return res.status(404).json({ message: "Item não encontrado." });
    await log(req, "PRODUTO_EXCLUIDO", product, "Item desativado (histórico preservado).");
    res.json({ message: "Item desativado." });
  } catch (e) { next(e); }
});
// Transferência patrimonial altera o responsável, sem consumir nem alterar o estoque.
router.post("/:id/transfer", adminOnly, async (req, res, next) => {
  try {
    const sector = String(req.body.sector || "").trim();
    if (!sector) return res.status(400).json({ message: "Informe o setor que receberá o bem." });
    const product = await Product.findOneAndUpdate({ _id: req.params.id, active: true, category: "BEM" }, { responsibleSector: sector }, { new: true });
    if (!product) return res.status(404).json({ message: "Bem patrimonial não encontrado." });
    await Movement.create({ action: "TRANSFERENCIA_BEM", details: "Bem transferido para " + sector, productId: product._id, productName: product.name, quantity: 1, unit: product.unit, sector, destination: "TRANSFERENCIA_BEM", userId: req.user._id, userName: req.user.name, role: req.user.role });
    res.json({ message: "Responsabilidade do bem transferida.", product });
  } catch (e) { next(e); }
});
module.exports = router;