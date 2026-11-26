// Login e consulta dos dados do usuário autenticado.
const router = require("express").Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const User = require("../models/User");
const Company = require("../models/Company");
const { auth, roleOf } = require("../middleware/auth");
const GENERAL_ADMINS = new Set(["lspbeto@gmail.com", "lspbeto@yahoo.com.br"]);
function publicUser(user) { return { id: user._id, name: user.name, displayName: user.displayName || user.name, loginName: user.loginName || "", email: user.email, registrationNumber: user.registrationNumber || "", isFictional: !!user.isFictional, role: roleOf(user), sector: user.sector || "", companyId: user.companyId || null, active: user.active }; }
function normalizeLoginName(value) { return String(value || "").normalize("NFC").trim().replace(/\\s+/g, " ").toLocaleLowerCase("pt-BR"); }
async function sendFirstAccessEmail(user, code) {
  const subject = "STOK - Código para primeiro acesso";
  const text = "Seu código de confirmação do STOK é " + code + ". Ele expira em 10 minutos. Se você não solicitou, ignore esta mensagem.";
  if (process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL) {
    const response = await fetch("https://api.resend.com/emails", { method: "POST", headers: { "Authorization": "Bearer " + process.env.RESEND_API_KEY, "Content-Type": "application/json" }, body: JSON.stringify({ from: process.env.RESEND_FROM_EMAIL, to: [user.email], subject, text, html: "<p>Seu código de confirmação do STOK é:</p><h2>" + code + "</h2><p>Ele expira em 10 minutos.</p>" }) });
    if (!response.ok) throw new Error("Não foi possível enviar o código de confirmação.");
    return;
  }
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    const transporter = nodemailer.createTransport({ host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT || 465), secure: String(process.env.SMTP_SECURE || "true") === "true", auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } });
    await transporter.sendMail({ from: process.env.SMTP_FROM || process.env.SMTP_USER, to: user.email, subject, text });
    return;
  }
  throw new Error("Envio de e-mail não configurado. Configure RESEND_API_KEY e RESEND_FROM_EMAIL no serviço do STOK.");
}
router.post("/login", async (req, res, next) => {
  try {
    const loginName = normalizeLoginName(req.body.loginName);
    const password = String(req.body.password || "");
    const user = await User.findOne({ loginName }).select("+passwordHash");
    if (!user || !user.active || !user.loginName || !(await bcrypt.compare(password, user.passwordHash))) return res.status(401).json({ message: "Login ou senha incorretos. Se ainda não configurou seu login, utilize Primeiro acesso." });
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || "8h" });
    res.json({ token, user: publicUser(user) });
  } catch (err) { next(err); }
});
// Lista apenas nomes de empresas para permitir que o novo operador escolha seu vínculo.
router.get("/companies", async (_req,res,next)=>{try{res.json(await Company.find({active:true}).select("name").sort({name:1}));}catch(e){next(e);}});

// Primeiro acesso: só usuários previamente cadastrados pela administração recebem um código.
router.post("/first-access/request", async (req, res, next) => {
  try {
    const email = String(req.body.email || "").toLowerCase().trim();
    if (!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email)) return res.status(400).json({ message: "Informe um e-mail válido." });
    const user = await User.findOne({ email, active: true }).select("+firstAccessCodeSentAt");
    const generic = "Se o e-mail estiver cadastrado e ainda não tiver um login configurado, enviaremos um código de confirmação.";
    if (!user || user.loginName) return res.json({ message: generic });
    if (user.firstAccessCodeSentAt && Date.now() - user.firstAccessCodeSentAt.getTime() < 60000) return res.json({ message: generic });
    const code = String(crypto.randomInt(0, 1000000)).padStart(6, "0");
    user.firstAccessCodeHash = crypto.createHash("sha256").update(code).digest("hex");
    user.firstAccessCodeExpires = new Date(Date.now() + 10 * 60 * 1000);
    user.firstAccessCodeSentAt = new Date();
    await user.save();
    try { await sendFirstAccessEmail(user, code); }
    catch (mailError) { user.firstAccessCodeHash = null; user.firstAccessCodeExpires = null; await user.save(); return res.status(503).json({ message: mailError.message }); }
    res.json({ message: generic });
  } catch (err) { next(err); }
});

router.post("/first-access/complete", async (req, res, next) => {
  try {
    const email = String(req.body.email || "").toLowerCase().trim();
    const code = String(req.body.code || "").trim();
    const loginName = normalizeLoginName(req.body.loginName);
    const displayName = String(req.body.displayName || "").trim();
    const password = String(req.body.password || "");
    if (!/^\\d{6}$/.test(code) || password.length < 8 || displayName.length < 2 || displayName.length > 60 || loginName.length < 3 || loginName.length > 40 || !/^[\\p{L}\\p{N}._ -]+$/u.test(loginName) || loginName.includes("@")) {
      return res.status(400).json({ message: "Confira o código, o nome de exibição, o login e a senha (mínimo de 8 caracteres)." });
    }
    const codeHash = crypto.createHash("sha256").update(code).digest("hex");
    const user = await User.findOne({ email, active: true, firstAccessCodeHash: codeHash, firstAccessCodeExpires: { $gt: new Date() } }).select("+firstAccessCodeHash +firstAccessCodeExpires");
    if (!user || user.loginName) return res.status(400).json({ message: "Código inválido ou expirado. Solicite um novo primeiro acesso." });
    if (await User.exists({ loginName })) return res.status(409).json({ message: "Este login já está em uso. Escolha outro." });
    user.loginName = loginName;
    user.displayName = displayName;
    user.passwordHash = await bcrypt.hash(password, 12);
    user.firstAccessCodeHash = null;
    user.firstAccessCodeExpires = null;
    user.firstAccessCodeSentAt = null;
    await user.save();
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || "8h" });
    res.json({ message: "Primeiro acesso configurado com sucesso.", token, user: publicUser(user) });
  } catch (err) { if (err.code === 11000) return res.status(409).json({ message: "Este login já está em uso. Escolha outro." }); next(err); }
});

// Cadastro aberto: cria sempre operador e exige empresa e setor.
router.post("/register", (_req, res) => res.status(403).json({ message: "O cadastro é feito pela administração. Se você já foi cadastrado, utilize Primeiro acesso para configurar seu login." }));

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

router.put("/me", auth, async (req, res, next) => {
  try {
    const displayName = String(req.body.displayName || "").trim();
    const loginName = normalizeLoginName(req.body.loginName);
    if (displayName.length < 2 || displayName.length > 60) return res.status(400).json({ message: "O nome de exibição deve ter entre 2 e 60 caracteres." });
    if (loginName.length < 3 || loginName.length > 40 || !/^[\\p{L}\\p{N}._ -]+$/u.test(loginName) || loginName.includes("@")) return res.status(400).json({ message: "O login deve ter de 3 a 40 caracteres e não pode ser um e-mail." });
    const duplicate = await User.findOne({ loginName, _id: { $ne: req.user._id } });
    if (duplicate) return res.status(409).json({ message: "Este login já está em uso. Escolha outro." });
    req.user.displayName = displayName;
    req.user.loginName = loginName;
    await req.user.save();
    res.json({ message: "Perfil atualizado.", user: publicUser(req.user) });
  } catch (err) { if (err.code === 11000) return res.status(409).json({ message: "Este login já está em uso." }); next(err); }
});

router.put("/me/password", auth, async (req, res, next) => {
  try {
    const currentPassword = String(req.body.currentPassword || "");
    const newPassword = String(req.body.newPassword || "");
    const user = await User.findById(req.user._id).select("+passwordHash");
    if (!user || !(await bcrypt.compare(currentPassword, user.passwordHash))) return res.status(400).json({ message: "A senha atual está incorreta." });
    if (newPassword.length < 8) return res.status(400).json({ message: "A nova senha deve ter pelo menos 8 caracteres." });
    user.passwordHash = await bcrypt.hash(newPassword, 12);
    await user.save();
    res.json({ message: "Senha alterada com sucesso." });
  } catch (err) { next(err); }
});
module.exports = router;