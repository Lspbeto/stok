// Histórico com filtro opcional por data. Administrador vê todos; operador vê apenas suas ações.
const router = require("express").Router();
const Movement = require("../models/Movement");
const { auth } = require("../middleware/auth");
router.get("/", auth, async (req, res, next) => {
  try {
    const filter = {};
    if (req.user.role !== "admin") filter.userId = req.user._id;
    if (req.query.from || req.query.to) {
      filter.createdAt = {};
      if (req.query.from) filter.createdAt.$gte = new Date(req.query.from + "T00:00:00.000Z");
      if (req.query.to) filter.createdAt.$lte = new Date(req.query.to + "T23:59:59.999Z");
    }
    const items = await Movement.find(filter).sort({ createdAt: -1 }).limit(1000);
    res.json(items);
  } catch (e) { next(e); }
});
module.exports = router;