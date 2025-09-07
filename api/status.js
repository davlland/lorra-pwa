const admin = require('firebase-admin');

function initAdmin() {
  if (!admin.apps.length) {
    const b64 = process.env.FIREBASE_SERVICE_ACCOUNT_B64;
    if (!b64) throw new Error('Falta FIREBASE_SERVICE_ACCOUNT_B64');
    const json = JSON.parse(Buffer.from(b64, 'base64').toString('utf8'));
    admin.initializeApp({ credential: admin.credential.cert(json) });
  }
  return admin.firestore();
}

module.exports = async (_req, res) => {
  try {
    const db = initAdmin();
    const subsSnap = await db.collection('subscriptions').get();
    const stateSnap = await db.collection('control').doc('state').get();
    res.json({
      ok: true,
      subs: subsSnap.size,
      state: stateSnap.exists ? stateSnap.data() : {}
    });
  } catch (e) {
    console.error('status error:', e);
    res.status(500).json({ ok: false, error: e.message });
  }
};
