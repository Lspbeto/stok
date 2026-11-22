
// Ferramentas administrativas para cópia e restauração integral do banco.
const router = require("express").Router();
const mongoose = require("mongoose");
const { EJSON } = require("bson");
const { auth, adminOnly } = require("../middleware/auth");
router.use(auth, adminOnly);

// Exporta as coleções da aplicação em Extended JSON, preservando ObjectIds e datas.
router.get("/backup", async (_req, res, next) => {
  try {
    const db = mongoose.connection.db;
    const names = (await db.listCollections({}, { nameOnly: true }).toArray())
      .map(x => x.name).filter(name => !name.startsWith("system."));
    const collections = {};
    for (const name of names) collections[name] = await db.collection(name).find({}).toArray();
    const backup = { app: "STOK", formatVersion: 1, createdAt: new Date().toISOString(), database: db.databaseName, collections };
    const content = EJSON.stringify(backup, { relaxed: false, indent: 2 });
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="stok-backup-' + new Date().toISOString().slice(0,10) + '.json"');
    res.send(content);
  } catch (err) { next(err); }
});

// Restaura somente backup STOK válido. Exige confirmação digitada pelo administrador.
router.post("/restore", async (req, res, next) => {
  try {
    if (req.body.confirmation !== "RESTAURAR STOK") {
      return res.status(400).json({ message: 'Para confirmar, envie confirmation: "RESTAURAR STOK".' });
    }
    const backup = req.body.backup;
    if (!backup || backup.app !== "STOK" || backup.formatVersion !== 1 || !backup.collections || typeof backup.collections !== "object" || Array.isArray(backup.collections)) {
      return res.status(400).json({ message: "Arquivo inválido. Selecione um backup JSON gerado pelo STOK." });
    }
    const db = mongoose.connection.db;
    const currentNames = (await db.listCollections({}, { nameOnly: true }).toArray()).map(x => x.name).filter(n => !n.startsWith("system."));
    const incomingNames = Object.keys(backup.collections);
    if (incomingNames.some(n => !/^[a-zA-Z0-9_]+$/.test(n) || n.startsWith("system.")) ||
        incomingNames.some(n => !Array.isArray(backup.collections[n]))) {
      return res.status(400).json({ message: "O backup contém coleções ou dados inválidos." });
    }
    // Cópia de segurança temporária em memória para tentar reverter se a restauração falhar.
    const snapshot = {};
    for (const name of currentNames) snapshot[name] = await db.collection(name).find({}).toArray();
    try {
      for (const name of new Set([...currentNames, ...incomingNames])) {
        const collection = db.collection(name);
        await collection.deleteMany({});
        const docs = backup.collections[name] || [];
        if (docs.length) await collection.insertMany(EJSON.parse(EJSON.stringify(docs, { relaxed: false }), { relaxed: false }), { ordered: true });
      }
    } catch (restoreError) {
      // Melhor esforço para retornar os dados anteriores em caso de falha.
      for (const name of new Set([...currentNames, ...incomingNames])) {
        try {
          const collection = db.collection(name);
          await collection.deleteMany({});
          const docs = snapshot[name] || [];
          if (docs.length) await collection.insertMany(docs, { ordered: true });
        } catch (rollbackError) { console.error("Falha ao reverter coleção", name, rollbackError); }
      }
      throw restoreError;
    }
    res.json({ message: "Banco restaurado com sucesso. Saia e entre novamente no STOK.", restoredCollections: incomingNames.length });
  } catch (err) { next(err); }
});
module.exports = router;
