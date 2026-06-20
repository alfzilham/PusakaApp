// =================================================================
// PUSAKA — POST /api/import
// Body: { entries: [ { nama, kategori }, ... ] }
// =================================================================
const { sql } = require('./_db');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method tidak didukung.' });
  }

  const { entries } = req.body || {};

  if (!Array.isArray(entries) || entries.length === 0) {
    return res.status(400).json({ error: 'Body harus berisi array "entries" yang tidak kosong.' });
  }

  // Validasi & bersihkan input
  const clean = entries
    .map((e) => ({
      nama: (e.nama || '').toString().trim(),
      kategori: (e.kategori || '').toString().trim().toLowerCase(),
    }))
    .filter((e) => e.nama && (e.kategori === 'laki-laki' || e.kategori === 'perempuan'));

  if (clean.length === 0) {
    return res.status(400).json({ error: 'Tidak ada baris valid (nama kosong atau kategori bukan laki-laki/perempuan).' });
  }

  try {
    let addedLaki = 0;
    let addedPerempuan = 0;

    for (const entry of clean) {
      const id = 'p_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
      const result = await sql`
        INSERT INTO participants (id, nama, kategori, status, alasan)
        VALUES (${id}, ${entry.nama}, ${entry.kategori}, 'belum', '')
        ON CONFLICT (LOWER(nama), kategori) DO NOTHING
        RETURNING id
      `;
      if (result.length > 0) {
        if (entry.kategori === 'laki-laki') addedLaki++;
        else addedPerempuan++;
      }
    }

    return res.status(200).json({ addedLaki, addedPerempuan, totalProcessed: clean.length });
  } catch (err) {
    console.error('Pusaka API error (/import):', err);
    return res.status(500).json({ error: 'Gagal menyimpan data ke database.' });
  }
};
