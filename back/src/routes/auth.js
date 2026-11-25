// Login e consulta dos dados do usuário autenticado.
const router = require("express").Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const User = require("../models/User");
const Company = require("../models/Company");
const { auth, roleOf } = require("../middleware/auth");
function publicUser(user) { return { id: user._id, name: user.name, email: user.email, registrationNumber: user.registrationNumber || "", isFictional: !!user.isFictional, role: roleOf(user), sector: user.sector || "" }; }
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
// Lista apenas nomes de empresas para permitir que o novo operador escolha seu vínculo.\nrouter.get("/companies", async (_req,res,next)=>{try{res.json(await Company.find({active:true}).select("name").sort({name:1}));}catch(e){next(e);}});\n\n// Cadastro aberto: cria sempre operador e exige empresa e setor.
router.post("/register", async (req, res, next) => {
  try {
    const name = String(req.body.name || "").trim();
    const email = String(req.body.email || "").toLowerCase().trim();
    const password = String(req.body.password || "");
    const sector = String(req.body.sector || "").trim();
    const registrationNumber = String(req.body.registrationNumber || "").trim();
    const companyId = req.body.companyId;
    if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 8 || !sector || !registrationNumber || !companyId) {
      return res.status(400).json({ message: "Informe nome, e-mail válido, senha com pelo menos 8 caracteres, empresa, setor e número de cadastro." });
    }
    if (!await Company.exists({ _id: companyId, active: true })) return res.status(400).json({ message: "Selecione uma empresa válida." });
    if (await User.exists({ email })) return res.status(409).json({ message: "Este e-mail já está cadastrado." });
    if (await User.exists({ registrationNumber })) return res.status(409).json({ message: "Este número de cadastro já está em uso." });
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({ name, email, passwordHash, registrationNumber, isFictional: registrationNumber.startsWith("0.0"), companyId, sector, role: "operador", active: true });
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || "8h" });
    res.status(201).json({ message: "Conta de operador criada com sucesso.", token, user: publicUser(user) });
  } catch (err) { next(err); }
});

/* Solicita link de recuperação. A resposta não revela se o e-mail existe. */
router.post("/forgot-password", async (req, res, next) => {
  try {
    const email = String(req.body.email || "").toLowerCase().trim();
    const user = await User.findOne({ email, active: true });
    if (user && process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS && process.env.FRONT_URL) {
      const token = crypto.randomBytes(32).toString("hex");
      user.passwordResetTokenHash = crypto.createHash("sha256").update(token).digest("hex");
      user.passwordResetExpires = new Date(Date.now() + 30 * 60 * 1000);
      await user.save();
      const base = process.env.FRONT_URL.replace(/\/$/, "");
      const link = base + "/?reset=" + token;
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT || 465),
        secure: String(process.env.SMTP_SECURE || "true") === "true",
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      });
      await transporter.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER, to: user.email,
        subject: "STOK - Recuperação de senha",
        text: "Recebemos uma solicitação para redefinir sua senha. Abra este link em até 30 minutos: " + link + "\nSe não solicitou, ignore esta mensagem."
      });
    }
    res.json({ message: "Se o e-mail estiver cadastrado e o envio estiver configurado, você receberá um link válido por 30 minutos." });
  } catch (err) { next(err); }
});

/* Redefine a senha com token temporário de uso único. */
router.post("/reset-password", async (req, res, next) => {
  try {
    const token = String(req.body.token || "");
    const password = String(req.body.password || "");
    if (token.length !== 64 || password.length < 8) return res.status(400).json({ message: "Link inválido ou senha com menos de 8 caracteres." });
    const hash = crypto.createHash("sha256").update(token).digest("hex");
    const user = await User.findOne({ passwordResetTokenHash: hash, passwordResetExpires: { $gt: new Date() }, active: true }).select("+passwordResetTokenHash +passwordResetExpires");
    if (!user) return res.status(400).json({ message: "Link inválido ou expirado. Solicite uma nova recuperação." });
    user.passwordHash = await bcrypt.hash(password, 12);
    user.passwordResetTokenHash = null;
    user.passwordResetExpires = null;
    await user.save();
    res.json({ message: "Senha alterada com sucesso. Você já pode entrar no STOK." });
  } catch (err) { next(err); }
});

router.get("/me", auth, (req, res) => res.json(publicUser(req.user)));
module.exports = router;