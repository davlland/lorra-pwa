module.exports = (req, res) => {
  const has = !!process.env.FIREBASE_SERVICE_ACCOUNT_B64;
  // también mostramos longitudes sin revelar secretos
  const len = (process.env.FIREBASE_SERVICE_ACCOUNT_B64 || '').length;
  res.json({ ok: true, FIREBASE_SERVICE_ACCOUNT_B64_present: has, length: len });
};
