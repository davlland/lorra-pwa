const { sendToAll, setCors, handlePreflight } = require('./_lib');

module.exports = async (req, res) => {
  if (handlePreflight(req, res)) return;
  setCors(res);
  try {
    if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });

    const payload = JSON.stringify({
      title: 'Test Lorra',
      body: 'Hola 👋 desde la API (Vercel)',
      url: '/'
    });
    const sent = await sendToAll(payload);
    res.json({ ok: true, sent });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
};
