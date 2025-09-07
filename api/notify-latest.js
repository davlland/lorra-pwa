const { checkFeedAndNotify, requireCronToken, setCors, handlePreflight } = require('./_lib');

module.exports = async (req, res) => {
  if (handlePreflight(req, res)) return;
  setCors(res);
  try {
    // Para uso manual: ?force=1  (no requiere token)
    const force = (req.query?.force === '1' || req.query?.force === 'true');

    if (!force) {
      // Para cron / producción: exige token si existe CRON_TOKEN
      requireCronToken(req);
    }

    const result = await checkFeedAndNotify({ force });
    res.status(result.ok ? 200 : 500).json(result);
  } catch (e) {
    res.status(e.status || 500).json({ ok: false, error: e.message });
  }
};
