-- Roles del CRM. Se ejecuta UNA vez, al inicializar el clúster.
--
-- La idea es que ningún rol pueda hacer más de lo que necesita. En particular,
-- la aplicación no puede alterar el esquema: así un fallo en tiempo de
-- ejecución no puede convertirse en un cambio de estructura, y una inyección
-- SQL no puede añadir una tabla ni borrar una columna.
--
-- Las contraseñas NO están aquí. Se inyectan por variables de entorno del
-- contenedor de inicialización, que a su vez las lee de ficheros de secreto.

\set ON_ERROR_STOP on

-- ── migrador: aplica DDL ────────────────────────────────────────────────────
CREATE ROLE socialpro_migrator LOGIN PASSWORD :'migrator_password';
COMMENT ON ROLE socialpro_migrator IS 'Aplica migraciones. Único rol con DDL.';

-- ── aplicación: datos, nunca estructura ─────────────────────────────────────
CREATE ROLE socialpro_app LOGIN PASSWORD :'app_password';
COMMENT ON ROLE socialpro_app IS 'Lectura y escritura de datos. Sin DDL.';

-- ── backup: solo lectura ────────────────────────────────────────────────────
CREATE ROLE socialpro_backup LOGIN PASSWORD :'backup_password';
COMMENT ON ROLE socialpro_backup IS 'Solo lectura, para volcados.';

-- El propietario ya existe (POSTGRES_USER). Es dueño del esquema y no debe
-- usarse desde ninguna aplicación.
COMMENT ON ROLE socialpro_owner IS 'Propietario técnico. No usar desde la app.';

-- ── permisos sobre el esquema public ────────────────────────────────────────
GRANT CONNECT ON DATABASE socialpro TO socialpro_migrator, socialpro_app, socialpro_backup;

-- El migrador necesita crear objetos.
GRANT USAGE, CREATE ON SCHEMA public TO socialpro_migrator;

-- La aplicación solo usa lo que ya existe.
GRANT USAGE ON SCHEMA public TO socialpro_app, socialpro_backup;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO socialpro_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO socialpro_app;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO socialpro_backup;

-- Lo mismo para lo que el migrador cree en el futuro. Sin esto, cada migración
-- que añade una tabla dejaría a la aplicación sin permisos sobre ella y el
-- fallo aparecería en producción, no al migrar.
ALTER DEFAULT PRIVILEGES FOR ROLE socialpro_migrator IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO socialpro_app;
ALTER DEFAULT PRIVILEGES FOR ROLE socialpro_migrator IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO socialpro_app;
ALTER DEFAULT PRIVILEGES FOR ROLE socialpro_migrator IN SCHEMA public
  GRANT SELECT ON TABLES TO socialpro_backup;

-- Drizzle guarda su historial en un esquema propio.
CREATE SCHEMA IF NOT EXISTS drizzle AUTHORIZATION socialpro_migrator;
GRANT USAGE ON SCHEMA drizzle TO socialpro_app, socialpro_backup;
ALTER DEFAULT PRIVILEGES FOR ROLE socialpro_migrator IN SCHEMA drizzle
  GRANT SELECT ON TABLES TO socialpro_app, socialpro_backup;

-- Nadie más puede crear objetos en public.
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
