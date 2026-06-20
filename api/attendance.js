// =================================================================
// PUSAKA — PUT /api/attendance
// Body: { id, status, alasan }
// =================================================================
const { sql } = require('./_db');

module.exports = async (req, res) => {
  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method tidak didukung.' });
  }

  const { id, status, alasan } = req.body || {};

  if (!id) {
    return res.status(400).json({ error: 'Parameter "id" wajib diisi.' });
  }
  if (status !== 'hadir' && status !== 'tidak-hadir') {
    return res.status(400).json({ error: 'Parameter "status" harus "hadir" atau "tidak-hadir".' });
  }

  try {
    const rows = await sql`
      UPDATE participants
      SET status = ${status},
          alasan = ${status === 'tidak-hadir' ? (alasan || '').toString().trim() : ''},
          updated_at = NOW()
      WHERE id = ${id}
      RETURNING id, nama, status, alasan, updated_at AS "updatedAt"
    `;

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Peserta tidak ditemukan.' });
    }

    return res.status(200).json({ participant: rows[0] });
  } catch (err) {
    console.error('Pusaka API error (/attendance):', err);
    return res.status(500).json({ error: 'Gagal menyimpan jawaban kehadiran.' });
  }
};
