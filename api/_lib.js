// api/_lib.js
// Utilidades compartidas por las functions de la API (Vercel)

const admin = require('firebase-admin');
const webpush = require('web-push');
const { XMLParser } = require('fast-xml-parser');
const crypto = require('crypto');

let firebaseReady = false;

/** CORS simple */
function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*'); // Si quieres restringir: 'https://lorra-pwa.vercel.app'
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Cron-Token');
}
function handlePreflight(req, res) {
  if (req.method === 'OPTIONS') {
    setCors(res);
    res.status(204).end();
    return true;
  }
  return false;
}

/** Inicializa Firebase Admin usando el JSON del service account en Base64 */
function ensureFirebase() {
  if (!firebaseReady) {
    const b64 = process.env.FIREBASE_SERVICE_ACCOUNT_B64;
    if (!b64) throw new Error('Falta FIREBASE_SERVICE_ACCOUNT_B64');

    const json = JSON.parse(Buffer.from(b64, 'base64').toString('utf8'));

    if (!admin.apps || !admin.apps.length) {
      admin.initializeApp({ credential: admin.credential.cert(json) });
    }
    firebaseReady = true;
  }
  return admin.firestore();
}

const SUBS_COL_NAME = 'subscriptions';
const CONTROL_DOC_PATH = 'control/state';

function getCollections(db) {
  return {
    subsCol: db.collection(SUBS_COL_NAME),
    controlDoc: db.doc(CONTROL_DOC_PATH),
  };
}

/** Configura web-push con VAPID desde variables de entorno */
function ensureVapid() {
  const pub = process.env.VAPID_PUBLIC_KEY;
  const pri = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !pri) throw new Error('Faltan VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY');

  webpush.setVapidDetails('mailto:you@example.com', pub, pri);
  return { pub, pri };
}

/** id estable y seguro para doc de suscripción */
function subDocId(endpoint = '') {
  return crypto.createHash('sha256').update(endpoint).digest('hex'); // 64 chars, seguro para Firestore
}

// -------- helpers UI texto -------
function stripHtml(html = '') {
  return String(html).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}
function truncate(text = '', n = 180) {
  return text.length > n ? text.slice(0, n) + '…' : text;
}

// -------- RSS --------
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

// -------- push a todos --------
async function sendToAll(payloadJson) {
  const db = ensureFirebase();
  ensureVapid();
  const { subsCol } = getCollections(db);

  const snap = await subsCol.get();
  const subs = snap.docs.map(d => ({ id: d.id, ...d.data() }));

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
        try { await subsCol.doc(r.reason.id).delete(); } catch (e) { /* ignore */ }
      } else {
        console.error('Error push:', code, r.reason?.err?.body || r.reason?.err?.message);
      }
    }
  }
  return results.filter(r => r.status === 'fulfilled').length;
}

// -------- chequea feed + notifica si hay novedad --------
async function checkFeedAndNotify({ force = false } = {}) {
  const db = ensureFirebase();
  ensureVapid();
  const { controlDoc } = getCollections(db);

  const item = await getLatestFromFeed();
  const snap = await controlDoc.get();
  const state = snap.exists ? snap.data() : {};
  const nowIso = new Date().toISOString();

  await controlDoc.set({ lastCheckAt: nowIso }, { merge: true });

  if (!force && state.lastGuidSent && state.lastGuidSent === item.guid) {
    return { ok: true, sent: 0, reason: 'no_new', guid: item.guid };
  }

  const body = truncate(stripHtml(item.description), 180);
  const payload = JSON.stringify({
    title: item.title || 'Nueva noticia',
    body,
    url: item.link || '/'
  });

  const sent = await sendToAll(payload);

  await controlDoc.set({ lastGuidSent: item.guid, lastSendAt: nowIso }, { merge: true });

  return { ok: true, sent, guid: item.guid, title: item.title };
}

function requireCronToken(req) {
  const qs = req.query || {};
  const headerToken = req.headers['x-cron-token'] || '';
  const bear = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  const token = qs.token || headerToken || bear || '';
  if (process.env.CRON_TOKEN && token !== process.env.CRON_TOKEN) {
    const err = new Error('Unauthorized (bad CRON_TOKEN)');
    err.status = 401;
    throw err;
  }
}

module.exports = {
  setCors,
  handlePreflight,

  ensureFirebase,
  getCollections,
  ensureVapid,
  sendToAll,
  checkFeedAndNotify,

  subDocId,
  requireCronToken,
};
