// Confere o token enviado pelo front e, quando necessário, exige administrador.
const jwt = require("jsonwebtoken");
const User = require("../models/User");
async function auth(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) return res.status(401).json({ message: "Faça login para continuar." });
    const data = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(data.id);
    if (!user || !user.active) return res.status(401).json({ message: "Usuário não autorizado." });
    req.user = user;
    next();
  } catch (_err) { return res.status(401).json({ message: "Sessão inválida ou expirada." }); }
}
function adminOnly(req, res, next) {
  if (req.user?.role !== "admin") return res.status(403).json({ message: "Apenas administrador pode executar esta ação." });
  next();
}
module.exports = { auth, adminOnly };