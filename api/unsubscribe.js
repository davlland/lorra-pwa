const { ensureFirebase, getCollections, subDocId, setCors, handlePreflight } = require('./_lib');

module.exports = async (req, res) => {
  if (handlePreflight(req, res)) return;
  setCors(res);
  try {
    if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });

    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch {}
    }
    const endpoint = body?.endpoint;
    if (!endpoint) return res.status(400).json({ ok: false, error: 'Falta endpoint' });

    const db = ensureFirebase();
    const { subsCol } = getCollections(db);
    await subsCol.doc(subDocId(endpoint)).delete();

    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
};
