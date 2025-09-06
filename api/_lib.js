// api/_lib.js  (CommonJS)
const admin = require('firebase-admin');
const webpush = require('web-push');
const { XMLParser } = require('fast-xml-parser');
const crypto = require('crypto');

// ---------- Firebase Admin (con env base64) ----------
if (!admin.apps.length) {
  const b64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
  if (!b64) throw new Error('FIREBASE_SERVICE_ACCOUNT_BASE64 no está definido');
  const serviceAccount = JSON.parse(
    Buffer.from(b64, 'base64').toString('utf-8')
  );
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}
const db = admin.firestore();
const SUBS_COL = db.collection('subscriptions');
const CONTROL_DOC = db.collection('control').doc('state');

// ---------- VAPID ----------
const VAPID_PUBLIC_KEY  = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
  throw new Error('Faltan VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY');
}
webpush.setVapidDetails('mailto:you@example.com', VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

// ---------- Utils ----------
function stripHtml(html = '') {
  return String(html).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}
function truncate(text = '', n = 180) {
  return text.length > n ? text.slice(0, n) + '…' : text;
}
async function getControl() {
  const s = await CONTROL_DOC.get();
  return s.exists ? s.data() : {};
}
async function setControl(patch) {
  await CONTROL_DOC.set(patch, { merge: true });
}
async function getAllSubscriptions() {
  const snap = await SUBS_COL.get();
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// ---------- RSS ----------
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

// ---------- Push ----------
async function sendToAll(payloadJson) {
  const subs = await getAllSubscriptions();
  const results = await Promise.allSettled(
    subs.map(s =>
      webpush
        .sendNotification({ endpoint: s.endpoint, keys: s.keys }, payloadJson)
        .catch(err => { throw { id: s.id, err }; })
    )
  );

  // limpieza de suscripciones inválidas (410/404)
  for (const r of results) {
    if (r.status === 'rejected') {
      const info = r.reason;
      const code = info?.err?.statusCode;
      if (code === 404 || code === 410) {
        await SUBS_COL.doc(info.id).delete();
      } else {
        console.error('Error push:', code, info?.err?.body || info?.err?.message);
      }
    }
  }
  return results.filter(r => r.status === 'fulfilled').length;
}

// ---------- Orquestador ----------
async function checkFeedAndNotify({ force = false, manual = false } = {}) {
  const item = await getLatestFromFeed();
  const nowIso = new Date().toISOString();
  const state = await getControl();
  const lastGuid = state.lastGuidSent || null;

  await setControl({ lastCheckAt: nowIso });

  if (!force && lastGuid && item.guid === lastGuid) {
    if (manual) console.log('[cron] no_new', item.guid);
    return { ok: true, sent: 0, reason: 'no_new', guid: item.guid };
  }

  const body = truncate(stripHtml(item.description), 180);
  const payload = JSON.stringify({
    title: item.title || 'Nueva noticia',
    body,
    url: item.link || '/'
  });

  const sent = await sendToAll(payload);
  await setControl({ lastGuidSent: item.guid, lastSendAt: nowIso });

  if (manual) console.log(`[cron] sent=${sent} guid=${item.guid}`);
  return { ok: true, sent, guid: item.guid, title: item.title };
}

module.exports = { checkFeedAndNotify };
