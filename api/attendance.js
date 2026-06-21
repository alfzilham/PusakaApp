// =================================================================
// PUSAKA — PUT /api/attendance
// Body: { id, status, alasan, buktiTransferUrl, buktiDikonfirmasi }
// =================================================================
const { sql } = require('./_db');

module.exports = async (req, res) => {
  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method tidak didukung.' });
  }

  const { id, status, alasan, buktiTransferUrl, buktiDikonfirmasi } = req.body || {};

  if (!id) {
    return res.status(400).json({ error: 'Parameter "id" wajib diisi.' });
  }
  if (status !== 'hadir' && status !== 'tidak-hadir') {
    return res.status(400).json({ error: 'Parameter "status" harus "hadir" atau "tidak-hadir".' });
  }

  // Validasi: status "hadir" wajib ada bukti transfer + konfirmasi
  if (status === 'hadir') {
    if (!buktiTransferUrl) {
      return res.status(400).json({ error: 'Bukti transfer wajib diupload untuk status hadir.' });
    }
    if (buktiDikonfirmasi !== true) {
      return res.status(400).json({ error: 'Centang konfirmasi pembayaran untuk status hadir.' });
    }
  }

  try {
    // Ambil data lama untuk cek apakah perlu hapus blob
    const old = await sql`
      SELECT bukti_transfer_url FROM participants WHERE id = ${id}
    `;

    const oldBuktiUrl = old[0]?.bukti_transfer_url;

    // Kalau status diubah ke "tidak-hadir", hapus blob dan reset bukti
    const shouldClearBukti = status === 'tidak-hadir';
    const didChangeToHadir = status === 'hadir' && oldBuktiUrl && oldBuktiUrl !== buktiTransferUrl;

    const rows = await sql`
      UPDATE participants
      SET status = ${status},
          alasan = ${status === 'tidak-hadir' ? (alasan || '').toString().trim() : ''},
          bukti_transfer_url = ${shouldClearBukti ? '' : (buktiTransferUrl || '')},
          bukti_dikonfirmasi = ${shouldClearBukti ? false : (status === 'hadir' ? true : false)},
          updated_at = NOW()
      WHERE id = ${id}
      RETURNING id, nama, status, alasan, bukti_transfer_url AS "buktiTransferUrl", bukti_dikonfirmasi AS "buktiDikonfirmasi", updated_at AS "updatedAt"
    `;

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Peserta tidak ditemukan.' });
    }

    // Hapus blob lama kalau diganti atau status berubah ke tidak-hadir
    if ((shouldClearBukti || didChangeToHadir) && oldBuktiUrl) {
      try {
        const { del } = await import('@vercel/blob');
        await del(oldBuktiUrl);
      } catch (_) { /* non-fatal */ }
    }

    return res.status(200).json({ participant: rows[0] });
  } catch (err) {
    console.error('Pusaka API error (/attendance):', err);
    return res.status(500).json({ error: 'Gagal menyimpan jawaban kehadiran.' });
  }
};
