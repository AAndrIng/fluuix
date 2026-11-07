-- Aplicar después de 001 y ANTES del backend audit-fix.
-- 002 pertenece a la automatización: no renombrar ni sobrescribir esa migración.
-- No almacena cookies, firmas ni claves; solo nonces de sesión y su vencimiento.
BEGIN;

CREATE TABLE IF NOT EXISTS intercompany_revoked_sessions (
    nonce uuid PRIMARY KEY,
    expires_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS intercompany_revoked_session_expiry
    ON intercompany_revoked_sessions (expires_at);
ALTER TABLE intercompany_revoked_sessions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON intercompany_revoked_sessions FROM PUBLIC;

-- Los roles de navegador existen en Supabase, pero no siempre en Postgres local.
DO $$
DECLARE nombre_rol text;
BEGIN
    FOREACH nombre_rol IN ARRAY ARRAY['anon', 'authenticated'] LOOP
        IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = nombre_rol) THEN
            EXECUTE format('REVOKE ALL ON intercompany_revoked_sessions FROM %I', nombre_rol);
        END IF;
    END LOOP;
END $$;

-- Mantiene el esquema de acceso de 001. Un rol de aplicación sin bypass de RLS
-- necesita permisos y políticas revisados por el DBA; no se conceden automáticamente.
COMMIT;
