-- Migrasi untuk database yang dibuat sebelum Fase 4 (Kelola Pengguna).
-- Database baru tidak perlu file ini (sudah ada di schema.sql).
-- Aman dijalankan ulang.

-- Email disalin ke profiles agar admin bisa mengenali akun saat verifikasi.
-- Tabel auth.users milik Supabase tidak bisa dibaca dari aplikasi.
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email TEXT;

UPDATE profiles p SET email = u.email
FROM auth.users u
WHERE u.id = p.id AND p.email IS DISTINCT FROM u.email;

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO profiles (id, email, nip, nama, unit_kerja)
    VALUES (
        NEW.id,
        NEW.email,
        NULLIF(trim(NEW.raw_user_meta_data->>'nip'), ''),
        COALESCE(NULLIF(trim(NEW.raw_user_meta_data->>'nama'), ''), split_part(NEW.email, '@', 1)),
        NULLIF(trim(NEW.raw_user_meta_data->>'unit_kerja'), '')
    );
    RETURN NEW;
END;
$$;

-- Admin tidak boleh mencabut role admin atau verifikasi akunnya sendiri,
-- supaya tidak ada yang terkunci di luar aplikasi karena salah klik.
CREATE OR REPLACE FUNCTION cegah_ubah_akun_sendiri()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.id = auth.uid() AND (NEW.role <> OLD.role OR NEW.is_verified <> OLD.is_verified) THEN
        RAISE EXCEPTION 'Anda tidak bisa mengubah role atau verifikasi akun Anda sendiri.';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_cegah_ubah_sendiri ON profiles;
CREATE TRIGGER profiles_cegah_ubah_sendiri
    BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION cegah_ubah_akun_sendiri();

REVOKE EXECUTE ON FUNCTION cegah_ubah_akun_sendiri() FROM PUBLIC, anon, authenticated;
