// Execute este arquivo para criar o primeiro administrador definido no .env.
// O sistema atual identifica usuários pelo e-mail, não pelo username.
require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../models/User");

(async () => {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error("Configure MONGODB_URI no arquivo .env.");
    }

    await mongoose.connect(process.env.MONGODB_URI);

    const email = String(process.env.ADMIN_EMAIL || "").toLowerCase().trim();
    const password = String(process.env.ADMIN_PASSWORD || "");

    if (!email || !password) {
      throw new Error("Configure ADMIN_EMAIL e ADMIN_PASSWORD no .env.");
    }

    // Versões antigas do banco podem ter criado um índice único em "username".
    // Como o modelo atual usa "email", esse índice antigo pode bloquear
    // cadastros com username: null. Removemos somente esse índice obsoleto.
    const indexes = await User.collection.indexes();
    const oldUsernameIndex = indexes.find(index =>
      index.name === "username_1" ||
      (index.key && index.key.username === 1)
    );

    if (oldUsernameIndex) {
      await User.collection.dropIndex(oldUsernameIndex.name);
      console.log("Índice antigo de username removido.");
    }

    const exists = await User.findOne({ email });
    if (exists) {
      console.log("Já existe um usuário com esse e-mail. Nenhum novo administrador foi criado.");
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);
    await User.create({
      name: process.env.ADMIN_NAME || "Administrador",
      email,
      passwordHash,
      role: "admin",
      active: true
    });

    console.log("Administrador criado com sucesso.");
  } catch (error) {
    console.error("Falha ao criar administrador:", error.message);
    process.exitCode = 1;
  } finally {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  }
})();
