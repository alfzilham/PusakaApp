// =================================================================
// PUSAKA — GET /api/participants?kategori=laki-laki
//          DELETE /api/participants?kategori=laki-laki
// =================================================================
const { sql } = require('./_db');

module.exports = async (req, res) => {
  const kategori = (req.query.kategori || '').toString();

  if (kategori !== 'laki-laki' && kategori !== 'perempuan') {
    return res.status(400).json({ error: 'Parameter kategori wajib diisi "laki-laki" atau "perempuan".' });
  }

  try {
    if (req.method === 'GET') {
      const rows = await sql`
        SELECT id, nama, status, alasan, bukti_transfer_url AS "buktiTransferUrl", bukti_dikonfirmasi AS "buktiDikonfirmasi", updated_at AS "updatedAt"
        FROM participants
        WHERE kategori = ${kategori}
        ORDER BY nama ASC
      `;
      return res.status(200).json({ participants: rows });
    }

    if (req.method === 'DELETE') {
      // Validasi password dari environment variable
      const { password, alasan } = req.body || {};
      if (!process.env.DELETE_PASSWORD || password !== process.env.DELETE_PASSWORD) {
        return res.status(403).json({ error: 'Password salah.' });
      }
      if (!alasan || alasan.trim().length < 3) {
        return res.status(400).json({ error: 'Alasan penghapusan wajib diisi (minimal 3 karakter).' });
      }

      // Kumpulkan semua URL blob sebelum hapus data
      const toDelete = await sql`
        SELECT bukti_transfer_url FROM participants
        WHERE kategori = ${kategori} AND bukti_transfer_url != ''
      `;

      await sql`DELETE FROM participants WHERE kategori = ${kategori}`;

      // Hapus semua blob dari Vercel Blob
      if (toDelete.length > 0) {
        try {
          const { del } = await import('@vercel/blob');
          const urls = toDelete.map((r) => r.bukti_transfer_url);
          await del(urls);
        } catch (_) { /* non-fatal */ }
      }

      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Method tidak didukung.' });
  } catch (err) {
    console.error('Pusaka API error (/participants):', err);
    return res.status(500).json({ error: 'Gagal mengakses database. Periksa koneksi DATABASE_URL di Vercel.' });
  }
};
