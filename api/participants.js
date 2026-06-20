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
        SELECT id, nama, status, alasan, updated_at AS "updatedAt"
        FROM participants
        WHERE kategori = ${kategori}
        ORDER BY nama ASC
      `;
      return res.status(200).json({ participants: rows });
    }

    if (req.method === 'DELETE') {
      await sql`DELETE FROM participants WHERE kategori = ${kategori}`;
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Method tidak didukung.' });
  } catch (err) {
    console.error('Pusaka API error (/participants):', err);
    return res.status(500).json({ error: 'Gagal mengakses database. Periksa koneksi DATABASE_URL di Vercel.' });
  }
};
