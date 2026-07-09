-- Migración aditiva: guarda 1 link de Google Sheet por trato (campaign).
--
-- Justificación (PR: feat/tratos-sheet-link-tracking): el usuario duplica
-- manualmente la plantilla "Jolu - KD" en Google Sheets, pega el link en el
-- trato y el CRM la lee vía GOOGLE_SHEETS_API_KEY (API key pública, sin
-- OAuth ni Service Account) para calcular currentCount de los
-- dealDeliverableTrackers activos del trato.
--
-- Modelo: 1 link por trato (deal-level), NO 1 por fila de entregable.
--
-- NO destructivo:
--   · Solo AÑADE 5 columnas — todas NULLABLE.
--   · No modifica ni borra ningún dato.
--   · No borra columnas antiguas.
--   · Sin FKs (no depende de otras tablas).
--   · IF NOT EXISTS para idempotencia.
--   · Mismo patrón aditivo que 0017/0018/0030/0033/0110.
--
-- statement-breakpoint separa cada ALTER TABLE porque el runner Neon-HTTP
-- envía cada statement por separado (no acepta multi-statement en una sola query).

ALTER TABLE "campaigns" ADD COLUMN IF NOT EXISTS "tracking_sheet_url" text;--> statement-breakpoint
ALTER TABLE "campaigns" ADD COLUMN IF NOT EXISTS "tracking_sheet_spreadsheet_id" varchar(100);--> statement-breakpoint
ALTER TABLE "campaigns" ADD COLUMN IF NOT EXISTS "tracking_sheet_gid" varchar(20);--> statement-breakpoint
ALTER TABLE "campaigns" ADD COLUMN IF NOT EXISTS "last_tracking_sync_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "campaigns" ADD COLUMN IF NOT EXISTS "tracking_sync_error" text;
