-- FV.5 — el epígrafe IAE del talento, que es lo que decide si su factura
-- lleva retención.
--
-- El enum `talent_tax_type` ya existía (autonomo_es 15%, autonomo_es_nuevo 7%,
-- sl_sa 0…) pero no basta: un autónomo español puede estar de alta en la
-- sección 2ª (actividad profesional, retiene) o en la 1ª (empresarial —
-- 961.1 audiovisual, 844 publicidad — que NO retiene). Sin ese dato el
-- validador de gastos no puede distinguir una factura sin retención correcta de
-- una a la que le falta.
--
-- Dos columnas y no una:
--   · iae_epigrafe   el código tal cual lo pone el alta censal. Informativo,
--                    para que la gestoría lo reconozca.
--   · iae_actividad  la sección, que es lo que el validador consulta.
--
-- Se guardan por separado a propósito: del número del epígrafe no se puede
-- deducir la sección con una regla sintáctica, y adivinarla sería inventar
-- criterio fiscal. `NULL` significa "no lo sabemos" y hace que el asistente
-- avise en vez de dar por buena una factura sin retención.
--
-- Escrita A MANO. Idempotente: el build de Vercel la ejecuta en cada deploy.

DO $$ BEGIN
  CREATE TYPE "public"."talent_iae_actividad" AS ENUM ('profesional', 'empresarial');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

ALTER TABLE "talents" ADD COLUMN IF NOT EXISTS "iae_epigrafe" varchar(20);
--> statement-breakpoint

ALTER TABLE "talents" ADD COLUMN IF NOT EXISTS "iae_actividad" "public"."talent_iae_actividad";
