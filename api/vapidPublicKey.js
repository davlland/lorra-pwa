const { ensureVapid, setCors, handlePreflight } = require('./_lib');

module.exports = async (req, res) => {
  if (handlePreflight(req, res)) return;
  setCors(res);
  try {
    const { pub } = ensureVapid();
    res.json({ key: pub });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
};
