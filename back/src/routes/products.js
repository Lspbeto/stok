// Cadastro e manutenção de produtos. Exclusões são lógicas para preservar o histórico.
const router = require("express").Router();
const Product = require("../models/Product");
const Movement = require("../models/Movement");
const { auth } = require("../middleware/auth");
router.use(auth);
async function log(req, action, product, details) {
  await Movement.create({ action, details, productId: product?._id || null, productName: product?.name || "", userId: req.user._id, userName: req.user.name, role: req.user.role });
}
router.get("/", async (_req, res, next) => {
  try { res.json(await Product.find({ active: true }).sort({ name: 1 })); } catch (e) { next(e); }
});
router.post("/", async (req, res, next) => {
  try {
    const { name, code, description, quantity, minimum, unit, expiryDate } = req.body;
    if (!name) return res.status(400).json({ message: "O nome do produto é obrigatório." });
    const product = await Product.create({
      name, code, description, quantity: Number(quantity || 0), minimum: Number(minimum || 0),
      unit: unit || "un", expiryDate: expiryDate || null
    });
    await log(req, "PRODUTO_CRIADO", product, "Produto cadastrado.");
    res.status(201).json(product);
  } catch (e) { next(e); }
});
router.put("/:id", async (req, res, next) => {
  try {
    // Lista explícita: evita que o navegador altere campos internos do produto.
    const allowed = ["name", "code", "description", "minimum", "unit", "expiryDate"];
    const updates = {};
    allowed.forEach((key) => { if (req.body[key] !== undefined) updates[key] = req.body[key]; });
    const product = await Product.findOneAndUpdate({ _id: req.params.id, active: true }, updates, { new: true, runValidators: true });
    if (!product) return res.status(404).json({ message: "Produto não encontrado." });
    await log(req, "PRODUTO_EDITADO", product, "Dados do produto alterados.");
    res.json(product);
  } catch (e) { next(e); }
});
router.delete("/:id", async (req, res, next) => {
  try {
    const product = await Product.findOneAndUpdate({ _id: req.params.id, active: true }, { active: false }, { new: true });
    if (!product) return res.status(404).json({ message: "Produto não encontrado." });
    await log(req, "PRODUTO_EXCLUIDO", product, "Produto desativado (histórico preservado).");
    res.json({ message: "Produto excluído." });
  } catch (e) { next(e); }
});
module.exports = router;