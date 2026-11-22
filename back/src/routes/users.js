// Administração de usuários. Somente administrador pode criar/listar usuários.
const router = require("express").Router();
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const Movement = require("../models/Movement");
const { auth, adminOnly } = require("../middleware/auth");
router.use(auth, adminOnly);
router.get("/", async (_req, res, next) => {
  try { res.json(await User.find().select("name email role active createdAt")); } catch (e) { next(e); }
});
router.post("/", async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password || password.length < 8) return res.status(400).json({ message: "Informe nome, e-mail e senha com pelo menos 8 caracteres." });
    if (!["admin", "operador"].includes(role || "operador")) return res.status(400).json({ message: "Perfil inválido." });
    const user = await User.create({ name, email, passwordHash: await bcrypt.hash(password, 12), role: role || "operador" });
    await Movement.create({ action: "USUARIO_CRIADO", details: "Usuário " + user.email + " criado.", userId: req.user._id, userName: req.user.name, role: req.user.role });
    res.status(201).json({ id: user._id, name: user.name, email: user.email, role: user.role });
  } catch (e) { if (e.code === 11000) return res.status(409).json({ message: "Este e-mail já está cadastrado." }); next(e); }
});
module.exports = router;