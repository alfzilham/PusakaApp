-- =================================================================
-- PUSAKA — Migration: tambah kolom bukti transfer & konfirmasi
-- =================================================================
-- Jalankan di Neon SQL Editor jika tabel sudah ada (deploy lama).
-- Untuk fresh install, schema.sql sudah include kolom ini.
-- =================================================================

ALTER TABLE participants ADD COLUMN IF NOT EXISTS bukti_transfer_url TEXT DEFAULT '';
ALTER TABLE participants ADD COLUMN IF NOT EXISTS bukti_dikonfirmasi BOOLEAN DEFAULT FALSE;
