-- SCRAM-SHA-256 para todas las contraseñas, no md5.
-- Debe ir ANTES de crear los roles: las contraseñas se cifran con el método
-- vigente en el momento de crearlas.
ALTER SYSTEM SET password_encryption = 'scram-sha-256';
SELECT pg_reload_conf();
