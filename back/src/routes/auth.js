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
router.get("/me", auth, (req, res) => res.json(publicUser(req.user)));
module.exports = router;