// api/notify-latest.js
const { checkFeedAndNotify } = require('./_lib');

module.exports = async (req, res) => {
  try {
    const q = req.query || {};
    const force = q.force === '1' || q.force === 'true';
    const result = await checkFeedAndNotify({ force, manual: true });
    res.status(result.ok ? 200 : 500).json(result);
  } catch (e) {
    console.error('notify-latest error:', e);
    res.status(500).json({ ok: false, error: e.message });
  }
};
