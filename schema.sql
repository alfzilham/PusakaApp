-- =================================================================
-- PUSAKA — Database Schema (Neon / Postgres)
-- =================================================================
-- Jalankan file ini sekali di Neon SQL Editor sebelum deploy,
-- atau lewat: psql "$DATABASE_URL" -f schema.sql

CREATE TABLE IF NOT EXISTS participants (
  id          TEXT PRIMARY KEY,
  nama        TEXT NOT NULL,
  kategori    TEXT NOT NULL CHECK (kategori IN ('laki-laki', 'perempuan')),
  status      TEXT NOT NULL DEFAULT 'belum' CHECK (status IN ('belum', 'hadir', 'tidak-hadir')),
  alasan      TEXT DEFAULT '',
  updated_at  TIMESTAMPTZ
);

-- Mencegah nama duplikat di kategori yang sama (case-insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS idx_participants_nama_kategori
  ON participants (LOWER(nama), kategori);

CREATE INDEX IF NOT EXISTS idx_participants_kategori ON participants (kategori);
CREATE INDEX IF NOT EXISTS idx_participants_status ON participants (status);
