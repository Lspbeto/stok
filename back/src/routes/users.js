// Administração de usuários. Operadores precisam estar ligados a um setor.
const router = require("express").Router();
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const Movement = require("../models/Movement");
const { auth, adminOnly } = require("../middleware/auth");
router.use(auth, adminOnly);
router.get("/", async (_req, res, next) => {
  try { res.json(await User.find().select("name email registrationNumber isFictional role sector active createdAt")); } catch (e) { next(e); }
});
router.post("/", async (req, res, next) => {
  try {
    const { name, email, password, role = "operador", sector = "", registrationNumber = "" } = req.body;
    const registration = String(registrationNumber).trim();
    if (!registration) return res.status(400).json({ message: "Informe o número de cadastro do usuário." });
    if (await User.exists({ registrationNumber: registration })) return res.status(409).json({ message: "Este número de cadastro já está em uso." });
    if (!name || !email || !password || password.length < 8) return res.status(400).json({ message: "Informe nome, e-mail e senha com pelo menos 8 caracteres." });
    if (!["admin", "operador"].includes(role)) return res.status(400).json({ message: "Perfil inválido." });
    if (role === "operador" && !String(sector).trim()) return res.status(400).json({ message: "Informe o setor do operador." });
    const user = await User.create({ name, email, registrationNumber: registration, isFictional: registration.startsWith("0.0"), sector: role === "operador" ? String(sector).trim() : "", passwordHash: await bcrypt.hash(password, 12), role });
    await Movement.create({ action: "USUARIO_CRIADO", details: "Usuário " + user.email + " criado.", userId: req.user._id, userName: req.user.name, role: req.user.role });
    res.status(201).json({ id: user._id, name: user.name, email: user.email, role: user.role, sector: user.sector, registrationNumber: user.registrationNumber, isFictional: user.isFictional });
  } catch (e) { if (e.code === 11000) return res.status(409).json({ message: "Este e-mail já está cadastrado." }); next(e); }
});
module.exports = router;