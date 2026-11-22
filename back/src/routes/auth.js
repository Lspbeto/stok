// Login e consulta dos dados do usuário autenticado.
const router = require("express").Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { auth } = require("../middleware/auth");
function publicUser(user) { return { id: user._id, name: user.name, email: user.email, role: user.role, sector: user.sector || "" }; }
router.post("/login", async (req, res, next) => {
  try {
    const email = String(req.body.email || "").toLowerCase().trim();
    const password = String(req.body.password || "");
    const user = await User.findOne({ email }).select("+passwordHash");
    if (!user || !user.active || !(await bcrypt.compare(password, user.passwordHash))) return res.status(401).json({ message: "E-mail ou senha incorretos." });
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || "8h" });
    res.json({ token, user: publicUser(user) });
  } catch (err) { next(err); }
});
// Cadastro aberto: cria sempre operador e exige setor de trabalho.
router.post("/register", async (req, res, next) => {
  try {
    const name = String(req.body.name || "").trim();
    const email = String(req.body.email || "").toLowerCase().trim();
    const password = String(req.body.password || "");
    const sector = String(req.body.sector || "").trim();
    if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 8 || !sector) {
      return res.status(400).json({ message: "Informe nome, e-mail válido, senha com pelo menos 8 caracteres e setor." });
    }
    if (await User.exists({ email })) return res.status(409).json({ message: "Este e-mail já está cadastrado." });
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({ name, email, passwordHash, sector, role: "operador", active: true });
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || "8h" });
    res.status(201).json({ message: "Conta de operador criada com sucesso.", token, user: publicUser(user) });
  } catch (err) { next(err); }
});
router.get("/me", auth, (req, res) => res.json(publicUser(req.user)));
module.exports = router;