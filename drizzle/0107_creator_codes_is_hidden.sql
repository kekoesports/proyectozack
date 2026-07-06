-- Añade `is_hidden` a `creator_codes` para permitir "pausar" un código
-- desde admin sin borrarlo. Útil cuando un partnership se enfría pero
-- se prevé reactivación: al ocultar se conservan clicks históricos,
-- analytics y la config del código. Al reactivar (toggle inverso) el
-- código vuelve a las páginas públicas idéntico.
--
-- Default false para no romper listados existentes.
-- Idempotente vía IF NOT EXISTS.

ALTER TABLE "creator_codes"
	ADD COLUMN IF NOT EXISTS "is_hidden" boolean DEFAULT false NOT NULL;
