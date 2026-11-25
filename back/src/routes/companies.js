// Cadastro de empresas com validação do CNPJ e identificação de registros fictícios.
const router = require("express").Router();
const Company = require("../models/Company");
const { auth, adminOnly } = require("../middleware/auth");
function isValidCnpj(value) {
  const cnpj = String(value || "").replace(/\D/g, "");
  if (cnpj.length !== 14 || /^(\d)\1{13}$/.test(cnpj)) return false;
  const calc = (base, weights) => {
    const sum = weights.reduce((total, weight, i) => total + Number(base[i]) * weight, 0);
    const mod = sum % 11;
    return mod < 2 ? 0 : 11 - mod;
  };
  const first = calc(cnpj.slice(0, 12), [5,4,3,2,9,8,7,6,5,4,3,2]);
  const second = calc(cnpj.slice(0, 12) + first, [6,5,4,3,2,9,8,7,6,5,4,3,2]);
  return cnpj.endsWith(String(first) + String(second));
}
async function verifyCnpjExists(cnpj) {
  const response = await fetch("https://brasilapi.com.br/api/cnpj/v1/" + cnpj, { signal: AbortSignal.timeout(8000) });
  if (response.status === 404) return false;
  if (!response.ok) throw new Error("Não foi possível consultar a Receita/base cadastral agora.");
  const data = await response.json();
  return String(data.cnpj || "").replace(/\D/g, "") === cnpj;
}
router.use(auth, adminOnly);
router.get("/", async (_req, res, next) => {
  try { res.json(await Company.find({ active: true }).sort({ name: 1 })); } catch (e) { next(e); }
});
router.post("/", async (req, res, next) => {
  try {
    const name = String(req.body.name || "").trim();
    const cnpj = String(req.body.cnpj || "").replace(/\D/g, "");
    if (!name || !cnpj) return res.status(400).json({ message: "Informe o nome e o CNPJ da empresa." });
    const isFictional = cnpj === "0000000000";
    if (!isFictional) {
      if (!isValidCnpj(cnpj)) return res.status(400).json({ message: "CNPJ inválido. Confira os 14 dígitos e os verificadores." });
      if (!(await verifyCnpjExists(cnpj))) return res.status(404).json({ message: "CNPJ não encontrado na consulta cadastral. Confira o número." });
      if (await Company.exists({ cnpj, active: true })) return res.status(409).json({ message: "Este CNPJ já está cadastrado." });
    }
    const company = await Company.create({ name, cnpj, isFictional });
    res.status(201).json(company);
  } catch (e) {
    if (e.name === "TimeoutError" || e.name === "AbortError") return res.status(503).json({ message: "A consulta do CNPJ demorou demais. Tente novamente." });
    next(e);
  }
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
