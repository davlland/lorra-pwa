// api/notify-latest.js
const { checkFeedAndNotify } = require('./_lib');

module.exports = async (req, res) => {
  // CORS básico (útil para probar desde navegador)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-cron-token');

  // Preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Acepta GET y POST
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', ['GET', 'POST', 'OPTIONS']);
    return res.status(405).end('Method Not Allowed');
  }

  // Verificación de token (query ?token=... o cabecera x-cron-token)
  const token = (req.query && req.query.token) || req.headers['x-cron-token'];
  if (process.env.CRON_TOKEN && token !== process.env.CRON_TOKEN) {
    return res.status(401).json({ ok: false, error: 'Unauthorized' });
  }

  try {
    const q = req.query || {};
    const b = (req.body && typeof req.body === 'object') ? req.body : {};

    // force por query (?force=1/true) o por body ({ force: true/'1'/'true' })
    const force =
      q.force === '1' || q.force === 'true' ||
      b.force === true || b.force === '1' || b.force === 'true';

    const result = await checkFeedAndNotify({ force, manual: true });
    return res.status(result.ok ? 200 : 500).json(result);
  } catch (e) {
    console.error('notify-latest error:', e);
    return res.status(500).json({ ok: false, error: e.message });
  }
};
