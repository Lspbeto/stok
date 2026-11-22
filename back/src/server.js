// Arquivo principal: configura o servidor, conecta ao MongoDB e registra as rotas.
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/users");
const productRoutes = require("./routes/products");
const movementRoutes = require("./routes/movements");

const app = express();
app.use(cors({ origin: process.env.FRONT_ORIGIN ? process.env.FRONT_ORIGIN.split(",") : true }));
app.use(express.json());

app.get("/api/health", (_req, res) => res.json({ ok: true, message: "API STOK funcionando" }));
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/products", productRoutes);
app.use("/api/movements", movementRoutes);

// Erros inesperados são registrados sem expor detalhes internos ao usuário.
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ message: err.message || "Erro interno do servidor." });
});

const PORT = process.env.PORT || 3000;
mongoose.connect(process.env.MONGODB_URI)
  .then(() => app.listen(PORT, () => console.log(`STOK API disponível na porta ${PORT}`)))
  .catch((err) => { console.error("Não foi possível conectar ao MongoDB:", err.message); process.exit(1); });