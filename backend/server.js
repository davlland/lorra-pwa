// backend/server.js
// ----------------- Backend local para desarrollo -----------------

const express = require('express');
const cors = require('cors');
const webpush = require('web-push');
const { XMLParser } = require('fast-xml-parser');
const crypto = require('crypto');

// --------- Firebase Admin (Firestore) ----------
const admin = require('firebase-admin');
// Este fichero está en .gitignore -> NO se sube al repo
const serviceAccount = require('./serviceAccount.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}
const db = admin.firestore();
const SUBS_COL = db.collection('subscriptions');       // 1 doc = 1 suscripción
const CONTROL_DOC = db.collection('control').doc('state'); // estado global (último guid, timestamps)

// --------- Config ----------
const PORT = process.env.PORT || 3001;

// --------- VAPID (desde variables de entorno) ----------
const VAPID_PUBLIC_KEY  = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;

if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
  console.error('❌ Faltan VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY en el entorno.');
  console.error('   En local, exporta las variables antes de arrancar:');
  console.error('   $env:VAPID_PUBLIC_KEY="..." ; $env:VAPID_PRIVATE_KEY="..." ; node backend/server.js');
  process.exit(1);
}

webpush.setVapidDetails(
  'mailto:you@example.com', // cambia por tu email de contacto
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

// --------- Utilidades ----------
function hashEndpoint(endpoint = '') {
  // id estable para cada suscripción
  return crypto.createHash('sha256').update(endpoint).digest('hex'); // 64 chars
}

function stripHtml(html = '') {
  return String(html).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}
function truncate(text = '', n = 180) {
  return text.length > n ? text.slice(0, n) + '…' : text;
}

async function getAllSubscriptions() {
  const snap = await SUBS_COL.get();
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

async function sendToAll(payloadJson) {
  const subs = await getAllSubscriptions();
  const results = await Promise.allSettled(
    subs.map(s =>
      webpush
        .sendNotification({ endpoint: s.endpoint, keys: s.keys }, payloadJson)
        .catch(err => { throw { id: s.id, err }; })
    )
  );

  // Limpieza de suscripciones inválidas
  for (const r of results) {
    if (r.status === 'rejected') {
      const code = r.reason?.err?.statusCode;
      if (code === 404 || code === 410) {
        await SUBS_COL.doc(r.reason.id).delete();
      } else {
        console.error('Error push:', code, r.reason?.err?.body || r.reason?.err?.message);
      }
    }
  }

  return results.filter(r => r.status === 'fulfilled').length;
}

async function getLatestFromFeed() {
  const resp = await fetch('https://lorra.eus/feed');
  if (!resp.ok) throw new Error(`HTTP ${resp.status} al leer el feed`);
  const xmlText = await resp.text();

  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '' });
  const data = parser.parse(xmlText);

  const channel = data?.rss?.channel;
  const items = Array.isArray(channel?.item) ? channel.item : (channel?.item ? [channel.item] : []);
  if (!items.length) throw new Error('Feed vacío');

  const first = items[0];
  const guidNode = first.guid;
  const guid = typeof guidNode === 'object'
    ? (guidNode['#text'] || guidNode._ || JSON.stringify(guidNode))
    : guidNode;

  return {
    title: first.title || '',
    link: first.link || '/',
    description: first.description || '',
    pubDate: first.pubDate || '',
    guid: guid || first.link || first.title || ''
  };
}

// --------- App Express ----------
const app = express();
app.use(cors());
app.use(express.json());

// 1) Pública para el cliente (está bien que sea visible)
app.get('/vapidPublicKey', (_req, res) => {
  res.json({ key: VAPID_PUBLIC_KEY });
});

// 2) Guardar suscripción
app.post('/subscribe', async (req, res) => {
  try {
    const sub = req.body;
    if (!sub?.endpoint || !sub?.keys?.p256dh || !sub?.keys?.auth) {
      return res.status(400).json({ ok: false, error: 'Suscripción inválida' });
    }
    const id = hashEndpoint(sub.endpoint);
    await SUBS_COL.doc(id).set(sub, { merge: true });
    res.status(201).json({ ok: true });
  } catch (e) {
    console.error('subscribe error:', e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// 3) Baja de suscripción
app.post('/unsubscribe', async (req, res) => {
  try {
    const { endpoint } = req.body || {};
    if (!endpoint) return res.status(400).json({ ok: false, error: 'Falta endpoint' });
    const id = hashEndpoint(endpoint);
    await SUBS_COL.doc(id).delete();
    res.json({ ok: true });
  } catch (e) {
    console.error('unsubscribe error:', e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// 4) Probar envío manual (test)
app.post('/test-push', async (_req, res) => {
  try {
    const payload = JSON.stringify({
      title: 'Test Lorra',
      body: 'Hola 👋 desde el backend (Firestore)',
      url: '/'
    });
    const sent = await sendToAll(payload);
    res.json({ ok: true, sent });
  } catch (e) {
    console.error('test-push error:', e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// 5) Última noticia del feed (para UI o depuración)
app.get('/feed-latest', async (_req, res) => {
  try {
    const item = await getLatestFromFeed();
    res.json({ ok: true, item });
  } catch (e) {
    console.error('feed-latest error:', e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// 6) Notificar si hay noticia nueva (con deduplicación por guid)
//    Se puede forzar con ?force=1
app.post('/notify-latest', async (req, res) => {
  try {
    const force = req.query.force === '1' || req.query.force === 'true';
    const nowIso = new Date().toISOString();

    const item = await getLatestFromFeed();
    const stateSnap = await CONTROL_DOC.get();
    const state = stateSnap.exists ? stateSnap.data() : {};
    const lastGuid = state.lastGuidSent || null;

    // guardamos el check
    await CONTROL_DOC.set({ lastCheckAt: nowIso }, { merge: true });

    if (!force && lastGuid && item.guid === lastGuid) {
      return res.json({ ok: true, sent: 0, reason: 'no_new', guid: item.guid });
    }

    const body = truncate(stripHtml(item.description), 180);
    const payload = JSON.stringify({
      title: item.title || 'Nueva noticia',
      body,
      url: item.link || '/'
    });

    const sent = await sendToAll(payload);

    await CONTROL_DOC.set(
      { lastGuidSent: item.guid, lastSendAt: nowIso },
      { merge: true }
    );

    res.json({ ok: true, sent, guid: item.guid, title: item.title });
  } catch (e) {
    console.error('notify-latest error:', e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// 7) Estado rápido (útil para depurar)
app.get('/status', async (_req, res) => {
  try {
    const subsSnap = await SUBS_COL.get();
    const stateSnap = await CONTROL_DOC.get();
    res.json({
      ok: true,
      subs: subsSnap.size,
      state: stateSnap.exists ? stateSnap.data() : {}
    });
  } catch (e) {
    console.error('status error:', e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Arranque del servidor local
app.listen(PORT, () => {
  console.log(`Backend en http://localhost:${PORT}`);
});
