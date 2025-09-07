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
    const sub = body || {};
    if (!sub?.endpoint || !sub?.keys?.p256dh || !sub?.keys?.auth) {
      return res.status(400).json({ ok: false, error: 'Suscripción inválida' });
    }

    const db = ensureFirebase();
    const { subsCol } = getCollections(db);
    const id = subDocId(sub.endpoint);
    await subsCol.doc(id).set(sub, { merge: true });

    res.status(201).json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
};
