// Execute uma vez para criar o primeiro administrador definido no arquivo .env.
require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const email = String(process.env.ADMIN_EMAIL || "").toLowerCase().trim();
    if (!email || !process.env.ADMIN_PASSWORD) throw new Error("Configure ADMIN_EMAIL e ADMIN_PASSWORD no .env.");
    const exists = await User.findOne({ email });
    if (exists) { console.log("Este administrador já existe."); return; }
    await User.create({ name: process.env.ADMIN_NAME || "Administrador", email, passwordHash: await bcrypt.hash(process.env.ADMIN_PASSWORD, 12), role: "admin" });
    console.log("Administrador criado com sucesso.");
  } catch (e) { console.error("Falha ao criar administrador:", e.message); process.exitCode = 1; }
  finally { await mongoose.disconnect(); }
})();