-- Añade campo estructurado al brief de marca.
-- brief_content almacena el formulario editable (description, cta, guidelines, etc.)
-- como jsonb para máxima flexibilidad sin romper la tabla existente.
ALTER TABLE "brand_briefs" ADD COLUMN IF NOT EXISTS "brief_content" jsonb;
