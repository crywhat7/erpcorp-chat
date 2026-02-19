-- =============================================
-- PORTAL ERP "THE TIMES" - Esquema erp_corp
-- Ejecutar en el editor SQL de Supabase
-- =============================================

-- Esquema y permisos para anon/authenticated
CREATE SCHEMA IF NOT EXISTS erp_corp;
GRANT USAGE ON SCHEMA erp_corp TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA erp_corp TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA erp_corp TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA erp_corp GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA erp_corp GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;

-- Tabla usuarios (login manual, sin auth.users)
CREATE TABLE erp_corp.usuarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  username text NOT NULL UNIQUE,
  password text NOT NULL,
  tarea_actual text,
  tarea_inicio timestamptz,
  avatar_url text,
  role text NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  created_at timestamptz DEFAULT now()
);

-- Tabla canales
CREATE TABLE erp_corp.canales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  slug text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now()
);

-- Tabla mensajes
CREATE TABLE erp_corp.mensajes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  canal_id uuid NOT NULL REFERENCES erp_corp.canales(id) ON DELETE CASCADE,
  usuario_id uuid NOT NULL REFERENCES erp_corp.usuarios(id) ON DELETE CASCADE,
  texto text NOT NULL,
  creado_at timestamptz DEFAULT now()
);

-- Índices para mensajes (realtime y listados)
CREATE INDEX idx_mensajes_canal_creado ON erp_corp.mensajes(canal_id, creado_at DESC);

-- Tabla fases
CREATE TABLE erp_corp.fases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo text NOT NULL,
  orden int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Tabla pasos
CREATE TABLE erp_corp.pasos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fase_id uuid NOT NULL REFERENCES erp_corp.fases(id) ON DELETE CASCADE,
  descripcion text NOT NULL,
  asignado_id uuid REFERENCES erp_corp.usuarios(id) ON DELETE SET NULL,
  estado text NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'proceso', 'listo')),
  orden int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Tabla recursos
CREATE TABLE erp_corp.recursos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre_archivo text NOT NULL,
  url_bucket text NOT NULL,
  subido_por uuid REFERENCES erp_corp.usuarios(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- =============================================
-- RLS DESACTIVADO (acceso total, seguridad manual)
-- =============================================
ALTER TABLE erp_corp.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp_corp.canales ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp_corp.mensajes ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp_corp.fases ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp_corp.pasos ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp_corp.recursos ENABLE ROW LEVEL SECURITY;

-- Políticas que permiten todo (equivalente a acceso total)
CREATE POLICY "allow_all_usuarios" ON erp_corp.usuarios FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_canales" ON erp_corp.canales FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_mensajes" ON erp_corp.mensajes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_fases" ON erp_corp.fases FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_pasos" ON erp_corp.pasos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_recursos" ON erp_corp.recursos FOR ALL USING (true) WITH CHECK (true);

-- =============================================
-- REALTIME: publicar mensajes y usuarios
-- En Dashboard: Settings > API > Exposed schemas > añadir "erp_corp"
-- =============================================
ALTER PUBLICATION supabase_realtime ADD TABLE erp_corp.mensajes;
ALTER PUBLICATION supabase_realtime ADD TABLE erp_corp.usuarios;

-- =============================================
-- STORAGE: bucket recursos_erp
-- =============================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('recursos_erp', 'recursos_erp', true)
ON CONFLICT (id) DO NOTHING;

-- Política de storage para permitir todo (ajustar según necesidad)
CREATE POLICY "allow_all_recursos_erp"
ON storage.objects FOR ALL
USING (bucket_id = 'recursos_erp')
WITH CHECK (bucket_id = 'recursos_erp');

INSERT INTO storage.buckets (id, name, public)
VALUES ('avatares', 'avatares', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "allow_all_avatares"
ON storage.objects FOR ALL
USING (bucket_id = 'avatares')
WITH CHECK (bucket_id = 'avatares');

-- =============================================
-- DATOS INICIALES (opcional)
-- =============================================
INSERT INTO erp_corp.canales (nombre, slug) VALUES
  ('General', 'general'),
  ('Operaciones', 'operaciones'),
  ('Legal', 'legal')
ON CONFLICT DO NOTHING;

INSERT INTO erp_corp.fases (titulo, orden) VALUES
  ('Fase 1: Análisis', 1),
  ('Fase 2: Diseño', 2),
  ('Fase 3: Implementación', 3);

-- Usuario admin de prueba (cambiar en producción)
INSERT INTO erp_corp.usuarios (nombre, username, password, role)
VALUES ('Admin', 'admin', 'admin', 'admin')
ON CONFLICT (username) DO UPDATE SET role = 'admin';
