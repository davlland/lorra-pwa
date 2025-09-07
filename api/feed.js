// api/feed.js
const { XMLParser } = require('fast-xml-parser');

// Caché simple en memoria (vive mientras la función “caliente” en Vercel)
let _cache = { at: 0, ttlMs: 5 * 60 * 1000, data: null };

const FEED_URL = process.env.FEED_URL || 'https://lorra.eus/feed';

// Utilidades
const stripHtml = (html = '') =>
  String(html).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

function normItems(data) {
  const ch = data?.rss?.channel;
  const items = Array.isArray(ch?.item) ? ch.item : (ch?.item ? [ch.item] : []);
  return items.map((it) => {
    const guidNode = it.guid;
    const guid = typeof guidNode === 'object'
      ? (guidNode['#text'] || guidNode._ || JSON.stringify(guidNode))
      : (guidNode || it.link || it.title || '');

    return {
      title: it.title || '',
      link: it.link || '/',
      guid,
      isoDate: it.pubDate ? new Date(it.pubDate).toISOString() : null,
      description: stripHtml(it.description || ''),
    };
  });
}

module.exports = async (req, res) => {
  // CORS básico
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    const limit = Math.max(1, Math.min(parseInt(req.query.limit || '20', 10), 100));

    // Sirve desde caché si está fresco
    const now = Date.now();
    if (_cache.data && now - _cache.at < _cache.ttlMs) {
      return res.status(200).json({ ok: true, cached: true, items: _cache.data.slice(0, limit) });
    }

    // Descarga el RSS
    const r = await fetch(FEED_URL, { headers: { 'User-Agent': 'lorra-api/1.0 (+vercel)' } });
    if (!r.ok) throw new Error(`HTTP ${r.status} al leer el feed`);
    const xml = await r.text();

    // Parsea
    const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '' });
    const data = parser.parse(xml);
    const items = normItems(data);

    // Actualiza caché
    _cache = { ..._cache, at: now, data: items };

    res.status(200).json({ ok: true, cached: false, items: items.slice(0, limit) });
  } catch (e) {
    console.error('feed error:', e);
    res.status(500).json({ ok: false, error: e.message });
  }
};
