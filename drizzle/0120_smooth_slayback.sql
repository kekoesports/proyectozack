-- Residuo histórico: entre el 24 y el 28 de junio de 2026 el importador insertaba
-- una fila nueva marcada 'duplicate' en cada pasada en lugar de no insertar nada.
-- Quedaron 1374 filas (69% de la tabla). Ambos caminos de importación ya filtran
-- en memoria desde entonces, pero eso no cubre dos syncs solapados: de ahí el
-- índice único de abajo.
--
-- Verificado en producción antes de escribir esto:
--   · 0 grupos donde TODAS las filas sean 'duplicate' (no se pierde ninguna URL)
--   · 0 grupos que sigan duplicados tras el borrado
--   · 0 trackers cuyo current_count deje de cuadrar
DELETE FROM "deal_deliverable_items" WHERE "status" = 'duplicate';
--> statement-breakpoint
-- Red de seguridad para entornos cuyo residuo no esté marcado como 'duplicate'
-- (preview, ramas): conserva la fila más antigua de cada (tracker, url).
DELETE FROM "deal_deliverable_items" a
USING "deal_deliverable_items" b
WHERE a."tracker_id" = b."tracker_id"
  AND a."normalized_url" = b."normalized_url"
  AND a."id" > b."id";
--> statement-breakpoint
CREATE UNIQUE INDEX "deal_items_tracker_url_uidx" ON "deal_deliverable_items" USING btree ("tracker_id","normalized_url");
