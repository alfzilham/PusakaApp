// =================================================================
// PUSAKA — POST /api/upload
// Terima base64 dari frontend, upload ke Vercel Blob, kembalikan URL
//
// Alur:
// 1. Frontend kompres gambar via Canvas API → base64
// 2. Kirim JSON { participantId, imageBase64, mimeType }
// 3. Server decode → upload ke Vercel Blob → hapus blob lama → return URL
// =================================================================
const { neon } = require('@neondatabase/serverless');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method tidak didukung.' });
  }

  const sql = neon(process.env.DATABASE_URL);

  try {
    const { put, del } = await import('@vercel/blob');
    const { participantId, imageBase64, mimeType } = req.body || {};

    if (!participantId) {
      return res.status(400).json({ error: 'Parameter participantId wajib diisi.' });
    }
    if (!imageBase64) {
      return res.status(400).json({ error: 'Data gambar (imageBase64) wajib diisi.' });
    }

    const buffer = Buffer.from(imageBase64, 'base64');
    const ext = (mimeType || 'image/jpeg').split('/')[1] || 'jpg';

    // Upload ke Vercel Blob — path per peserta
    const blob = await put(`bukti/${participantId}.${ext}`, buffer, {
      access: 'public',
      contentType: mimeType || 'image/jpeg',
      addRandomSuffix: false,
    });

    // Hapus gambar lama dari Blob kalau ada
    const existing = await sql`
      SELECT bukti_transfer_url FROM participants WHERE id = ${participantId}
    `;
    const oldUrl = existing[0]?.bukti_transfer_url;
    if (oldUrl) {
      try { await del(oldUrl); } catch (_) { /* non-fatal */ }
    }

    return res.status(200).json({ url: blob.url });
  } catch (err) {
    console.error('Pusaka API error (/upload):', err);
    return res.status(500).json({ error: 'Gagal mengupload gambar.' });
  }
};
