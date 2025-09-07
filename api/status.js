const { ensureFirebase, getCollections, setCors, handlePreflight } = require('./_lib');

module.exports = async (_req, res) => {
  if (handlePreflight(_req, res)) return;
  setCors(res);
  try {
    const db = ensureFirebase();
    const { subsCol, controlDoc } = getCollections(db);

    const subsSnap = await subsCol.get();
    const stateSnap = await controlDoc.get();

    res.json({
      ok: true,
      env: {
        FIREBASE_SERVICE_ACCOUNT_B64: !!process.env.FIREBASE_SERVICE_ACCOUNT_B64,
        VAPID_PUBLIC_KEY: !!process.env.VAPID_PUBLIC_KEY,
        VAPID_PRIVATE_KEY: !!process.env.VAPID_PRIVATE_KEY,
      },
      subs: subsSnap.size,
      state: stateSnap.exists ? stateSnap.data() : {},
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
};
