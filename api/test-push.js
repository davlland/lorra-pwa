const admin = require('firebase-admin');
const webpush = require('web-push');

function initAdmin() {
  if (!admin.apps.length) {
    const b64 = process.env.FIREBASE_SERVICE_ACCOUNT_B64;
    if (!b64) throw new Error('Falta FIREBASE_SERVICE_ACCOUNT_B64');
    const json = JSON.parse(Buffer.from(b64, 'base64').toString('utf8'));
    admin.initializeApp({ credential: admin.credential.cert(json) });
  }
  return admin.firestore();
}

function initVapid() {
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) throw new Error('Faltan VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY');
  webpush.setVapidDetails('mailto:you@example.com', pub, priv);
}

module.exports = async (_req, res) => {
  try {
    initVapid();
    const db = initAdmin();

    const snap = await db.collection('subscriptions').get();
    const subs = snap.docs.map(d => d.data());

    const payload = JSON.stringify({
      title: 'Test Lorra',
      body: 'Hola 👋 desde la API',
      url: '/'
    });

    const results = await Promise.allSettled(
      subs.map(s => webpush.sendNotification({ endpoint: s.endpoint, keys: s.keys }, payload))
    );

    // limpieza de suscripciones inválidas
    for (const r of results) {
      if (r.status === 'rejected') {
        const code = r.reason?.statusCode;
        if (code === 404 || code === 410) {
          const id = require('crypto').createHash('sha256').update(r.reason.endpoint || '').digest('hex');
          try { await db.collection('subscriptions').doc(id).delete(); } catch {}
        }
      }
    }

    const sent = results.filter(r => r.status === 'fulfilled').length;
    res.json({ ok: true, sent, total: subs.length });
  } catch (e) {
    console.error('test-push error:', e);
    res.status(500).json({ ok: false, error: e.message });
  }
};
