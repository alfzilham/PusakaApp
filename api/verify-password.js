// =================================================================
// PUSAKA — POST /api/verify-password
// Verifikasi password DELETE tanpa menghapus data
// Body: { password }
// =================================================================
module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method tidak didukung.' });
  }

  const { password } = req.body || {};

  if (!password) {
    return res.status(400).json({ error: 'Password wajib diisi.' });
  }

  if (password === process.env.DELETE_PASSWORD) {
    return res.status(200).json({ ok: true });
  }

  return res.status(403).json({ error: 'Password salah.' });
};
