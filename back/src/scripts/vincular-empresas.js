// Vincula registros existentes às empresas LSPBeto e SENAC.
 // Execute em ambiente com backup: npm run vincular-empresas
require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../models/User");
const Company = require("../models/Company");
const Product = require("../models/Product");
const Movement = require("../models/Movement");

const GENERAL_ADMINS = new Set(["lspbeto@gmail.com", "lspbeto@yahoo.com.br"]);
const definitions = [
  { key: "lspbeto", name: "LSPBeto", pattern: /lspbeto/i },
  { key: "senac", name: "SENAC", pattern: /senac/i }
];
function identify(values) {
  const text = values.filter(Boolean).join(" ").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const matches = definitions.filter(item => item.pattern.test(text));
  return matches.length === 1 ? matches[0].key : null;
}
async function getCompany(def) {
  let company = await Company.findOne({ name: new RegExp(def.name, "i"), active: true });
  if (!company) company = await Company.create({ name: def.name, cnpj: "0000000000", isFictional: true, active: true });
  return company;
}
(async () => {
  try {
    if (!process.env.MONGODB_URI) throw new Error("Configure MONGODB_URI antes de executar a vinculação.");
    await mongoose.connect(process.env.MONGODB_URI);
    const companies = {};
    for (const def of definitions) companies[def.key] = await getCompany(def);

    let usersLinked = 0, productsLinked = 0, movementsLinked = 0, pendingUsers = 0, pendingProducts = 0;
    const users = await User.find({});
    const userCompany = new Map();
    for (const user of users) {
      const email = String(user.email || "").toLowerCase().trim();
      if (GENERAL_ADMINS.has(email)) {
        user.role = "adm_geral";
        user.companyId = null;
        await user.save();
        continue;
      }
      const key = identify([user.name, user.email, user.sector, user.registrationNumber]);
      if (key) {
        user.companyId = companies[key]._id;
        if (user.role === "admin") user.role = "adm_empresa";
        await user.save();
        userCompany.set(String(user._id), companies[key]._id);
        usersLinked++;
      } else {
        if (user.role === "admin") user.role = "adm_empresa";
        user.companyId = null;
        await user.save();
        pendingUsers++;
      }
    }

    const products = await Product.find({});
    const productCompany = new Map();
    for (const product of products) {
      const key = identify([product.name, product.code, product.description, product.patrimonyCode, product.responsibleSector]);
      if (key) {
        product.companyId = companies[key]._id;
        productCompany.set(String(product._id), companies[key]._id);
        await product.save();
        productsLinked++;
      } else pendingProducts++;
    }

    const movements = await Movement.find({});
    for (const movement of movements) {
      const byProduct = movement.productId ? productCompany.get(String(movement.productId)) : null;
      const byUser = userCompany.get(String(movement.userId));
      if (byProduct && byUser && String(byProduct) !== String(byUser)) continue;
      const companyId = byProduct || byUser;
      if (companyId) {
        movement.companyId = companyId;
        await movement.save();
        movementsLinked++;
      }
    }
    console.log(JSON.stringify({
      companies: Object.values(companies).map(c => ({ name: c.name, id: String(c._id) })),
      usersLinked, productsLinked, movementsLinked, pendingUsers, pendingProducts,
      note: "Registros sem correspondência única foram mantidos sem vínculo. Revise-os antes de liberar acesso empresarial."
    }, null, 2));
  } catch (error) {
    console.error("Falha na vinculação:", error.message);
    process.exitCode = 1;
  } finally {
    if (mongoose.connection.readyState) await mongoose.disconnect();
  }
})();
