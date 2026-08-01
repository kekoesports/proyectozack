-- Añade `creator_notes` a `campaigns` para separar notas visibles/relativas al
-- creador de las notas internas del equipo (`notes`).
--
-- NO destructivo: solo añade una columna nueva NULLABLE. `notes` se conserva
-- tal cual y sigue siendo usado por plantillas de contrato y por
-- create-invoice-from-deal.
--
-- IF NOT EXISTS para idempotencia (mismo patrón que 0111).

ALTER TABLE "campaigns" ADD COLUMN IF NOT EXISTS "creator_notes" text;
