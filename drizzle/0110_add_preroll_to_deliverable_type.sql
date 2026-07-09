-- Migración aditiva: añade `preroll` al enum `deliverable_type`.
--
-- Justificación (PR: tratos-entregables-editables): el módulo Tratos necesita
-- distinguir "Preroll" como tipo de entregable independiente para editar
-- cantidades objetivo en dealDeliverableTrackers y para replicar la plantilla
-- de seguimiento tipo "Jolu - KD" que separa Preroll y Video.
--
-- NO destructivo:
--   · Sólo AÑADE un valor al enum existente.
--   · No modifica ni borra ningún dato.
--   · IF NOT EXISTS para idempotencia si ya se aplicó.
--   · Mismo patrón que 0017/0018/0030/0033.

ALTER TYPE "public"."deliverable_type" ADD VALUE IF NOT EXISTS 'preroll';
