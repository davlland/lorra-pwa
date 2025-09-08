// api/feed.js
const { XMLParser } = require('fast-xml-parser');
const he = require('he');

// Caché simple en memoria (vive mientras la función “caliente” en Vercel)
let _cache = { at: 0, ttlMs: 5 * 60 * 1000, items: null };

const FEED_URL = process.env.FEED_URL || 'https://lorra.eus/feed';

// Utils
const decode = (s = '') => he.decode(String(s), { isAttributeValue: false });
const stripHtml = (html = '') =>
  String(html).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

function normalizeItems(data) {
  const ch = data?.rss?.channel;
  const raw = Array.isArray(ch?.item) ? ch.item : (ch?.item ? [ch.item] : []);
  return raw.map((it) => {
    // guid robusto
    const guidNode = it.guid;
    const guid = typeof guidNode === 'object'
      ? (guidNode['#text'] || guidNode._ || JSON.stringify(guidNode))
      : (guidNode || it.link || it.title || '');

    // algunos feeds ponen el cuerpo en content:encoded
    const rawDesc = it['content:encoded'] ?? it.description ?? '';
    const title = decode(it.title || '');
    const description = stripHtml(decode(rawDesc));

    return {
      title,
      link: it.link || '/',
      guid,
      isoDate: it.pubDate ? new Date(it.pubDate).toISOString() : null,
      description,
    };
  });
}

async function getAllItems() {
  const now = Date.now();
  if (_cache.items && now - _cache.at < _cache.ttlMs) return { items: _cache.items, cached: true };

  const r = await fetch(FEED_URL, { headers: { 'User-Agent': 'lorra-api/1.0 (+vercel)' } });
  if (!r.ok) throw new Error(`HTTP ${r.status} al leer el feed`);
  const xml = await r.text();

  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '' });
  const data = parser.parse(xml);
  const items = normalizeItems(data);

  _cache = { ..._cache, at: now, items };
  return { items, cached: false };
}

module.exports = async (req, res) => {
  // CORS + evita 304 (desactiva caché HTTP del navegador/edge)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    // Soporta page / pageSize y, por compat, limit
    const page = Math.max(0, parseInt(req.query.page ?? '0', 10));
    const pageSize = Math.max(1, Math.min(parseInt(req.query.pageSize ?? '20', 10), 100));
    const limit = req.query.limit ? Math.max(1, Math.min(parseInt(req.query.limit, 10), 100)) : null;

    const { items, cached } = await getAllItems();
    const total = items.length;

    let slice;
    if (limit != null) {
      // compat: /api/feed?limit=5
      slice = items.slice(0, limit);
    } else {
      const start = page * pageSize;
      slice = items.slice(start, start + pageSize);
    }

    res.status(200).json({
      ok: true,
      cached,
      total,
      page,
      pageSize,
      items: slice,
    });
  } catch (e) {
    console.error('feed error:', e);
    res.status(500).json({ ok: false, error: e.message });
  }
};
