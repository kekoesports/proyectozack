-- Añade `pdf_language` a `billing_clients` para permitir que cada cliente
-- tenga su propio idioma por defecto al generar el PDF de factura.
--
-- Valores esperados: 'es' | 'en'. Default 'en' porque la mayoría de clientes
-- son internacionales. Los clientes con NIF español pueden ponerse a 'es'
-- desde su ficha.
--
-- Override puntual disponible desde el botón de descarga sin persistirlo.
-- Idempotente vía IF NOT EXISTS.

ALTER TABLE "billing_clients"
	ADD COLUMN IF NOT EXISTS "pdf_language" varchar(2) DEFAULT 'en' NOT NULL;
