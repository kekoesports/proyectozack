-- FV.5 — perfil fiscal de persona fisica no dada de alta como autonomo.
--
-- El enum solo contemplaba autonomo, sociedad, LATAM y no residente. Falta el
-- caso de quien factura como particular por un trabajo puntual: se le practica
-- retencion de IRPF pero no repercute IVA, porque no esta de alta.
--
-- Sin este valor el CRM obligaba a etiquetarlo como autonomo, y entonces el
-- validador avisaba para siempre de que "un autonomo español factura con IVA"
-- sobre una factura que es correcta tal cual.
ALTER TYPE "public"."talent_tax_type" ADD VALUE IF NOT EXISTS 'persona_fisica_es';
