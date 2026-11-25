// Autenticação e autorização multiempresa. O ADM Geral é definido exclusivamente pelo e-mail.
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const GENERAL_ADMINS = new Set(["lspbeto@gmail.com", "lspbeto@yahoo.com.br"]);
function roleOf(user) {
  const email = String(user?.email || "").toLowerCase().trim();
  if (GENERAL_ADMINS.has(email)) return "adm_geral";
  if (user?.role === "admin" || user?.role === "adm_empresa") return "adm_empresa";
  if (user?.role === "adm_setor") return "adm_setor";
  return "operador";
}
function isGeneralAdmin(user) { return roleOf(user) === "adm_geral"; }
function isCompanyAdmin(user) { return ["adm_geral", "adm_empresa"].includes(roleOf(user)); }
function companyFilter(user, extra = {}) {
  if (isGeneralAdmin(user)) return extra;
  if (!user?.companyId) return { ...extra, _id: null };
  return { ...extra, companyId: user.companyId };
}
function canAccessCompany(user, companyId) {
  return isGeneralAdmin(user) || (!!user?.companyId && String(user.companyId) === String(companyId));
}
async function auth(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) return res.status(401).json({ message: "Faça login para continuar." });
    const data = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(data.id);
    if (!user || !user.active) return res.status(401).json({ message: "Usuário não autorizado." });
    user.role = roleOf(user);
    req.user = user;
    next();
  } catch (_err) { return res.status(401).json({ message: "Sessão inválida ou expirada." }); }
}
function adminOnly(req, res, next) {
  if (!isCompanyAdmin(req.user)) return res.status(403).json({ message: "Apenas administradores da empresa podem executar esta ação." });
  next();
}
function generalAdminOnly(req, res, next) {
  if (!isGeneralAdmin(req.user)) return res.status(403).json({ message: "Apenas ADM Geral pode executar esta ação." });
  next();
}
module.exports = { auth, adminOnly, generalAdminOnly, roleOf, isGeneralAdmin, isCompanyAdmin, companyFilter, canAccessCompany };
