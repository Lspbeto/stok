// Cadastro de empresas; somente administrador pode gerenciar empresas.
const router = require("express").Router();
const Company = require("../models/Company");
const { auth, adminOnly } = require("../middleware/auth");
router.use(auth, adminOnly);
router.get("/", async (_req, res, next) => {
  try { res.json(await Company.find({ active: true }).sort({ name: 1 })); } catch (e) { next(e); }
});
router.post("/", async (req, res, next) => {
  try {
    const name = String(req.body.name || "").trim();
    const cnpj = String(req.body.cnpj || "").replace(/[^0-9]/g, "");
    if (!name || !cnpj) return res.status(400).json({ message: "Informe o nome e o CNPJ da empresa." });
    const isFictional = cnpj === "0000000000";
    if (!isFictional && cnpj.length !== 14) return res.status(400).json({ message: "Informe um CNPJ com 14 dígitos ou use 0000000000 para empresa fictícia." });
    const company = await Company.create({ name, cnpj, isFictional });
    res.status(201).json(company);
  } catch (e) { next(e); }
});
router.delete("/:id", async (req, res, next) => {
  try {
    const company = await Company.findOne({ _id: req.params.id, active: true });
    if (!company) return res.status(404).json({ message: "Empresa não encontrada." });
    if (!company.isFictional) return res.status(403).json({ message: "Somente empresas fictícias podem ser excluídas por esta função." });
    company.active = false;
    await company.save();
    res.json({ message: "Empresa fictícia desativada." });
  } catch (e) { next(e); }
});
module.exports = router;
