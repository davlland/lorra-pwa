const admin = require('firebase-admin');
const crypto = require('crypto');

function initAdmin() {
  if (!admin.apps.length) {
    const b64 = process.env.FIREBASE_SERVICE_ACCOUNT_B64;
    if (!b64) throw new Error('Falta FIREBASE_SERVICE_ACCOUNT_B64');
    const json = JSON.parse(Buffer.from(b64, 'base64').toString('utf8'));
    admin.initializeApp({ credential: admin.credential.cert(json) });
  }
  return admin.firestore();
}

module.exports = async (req, res) => {
  try {
    if (req.method !== 'POST') return res.status(405).end('Method Not Allowed');
    const sub = req.body;
    if (!sub?.endpoint || !sub?.keys?.p256dh || !sub?.keys?.auth) {
      return res.status(400).json({ ok: false, error: 'Suscripción inválida' });
    }

    const db = initAdmin();
    const id = crypto.createHash('sha256').update(sub.endpoint).digest('hex');
    await db.collection('subscriptions').doc(id).set(sub, { merge: true });

    res.status(201).json({ ok: true });
  } catch (e) {
    console.error('subscribe error:', e);
    res.status(500).json({ ok: false, error: e.message });
  }
};
