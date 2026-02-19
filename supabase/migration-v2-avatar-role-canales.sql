-- =============================================
-- Migración v2: avatar, role, bucket avatares
-- Ejecutar después de schema.sql
-- =============================================

-- Usuarios: foto de perfil y rol (admin/user)
ALTER TABLE erp_corp.usuarios
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'user';

-- Marcar usuario admin existente
UPDATE erp_corp.usuarios SET role = 'admin' WHERE username = 'admin';

-- Bucket para fotos de perfil (público para lectura)
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatares', 'avatares', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "allow_all_avatares"
ON storage.objects FOR ALL
USING (bucket_id = 'avatares')
WITH CHECK (bucket_id = 'avatares');
