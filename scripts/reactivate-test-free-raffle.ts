/**
 * Reactiva el sorteo gratis de prueba de ZACKETIZOR (id=46) hasta
 * fin de julio 2026 para el lanzamiento de la semana que viene.
 *
 * Cambios:
 *   - ends_at   → 2026-07-31 23:59:59 Europe/Madrid (21:59:59Z verano CEST)
 *   - title     → "[Prueba] Sorteo gratis · Glock-18 | Block-18"
 *   - description → aviso de que es un sorteo de prueba pero el premio se
 *                    entregará normalmente.
 *   - status    → 'active' (idempotente — ya estaba active).
 *
 * Idempotente: se puede correr varias veces sin efectos colaterales;
 * escribe siempre los mismos valores. Sale con `false` si el id ya no
 * está o si el título canónico ha cambiado (protección contra correr
 * este script sobre otro sorteo por error).
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

import { neon } from '@neondatabase/serverless';

const GIVEAWAY_ID = 46;
const CANONICAL_TITLE_PREFIX = 'Glock-18 | Block-18'; // se preserva entre `[TEST]` y `[Prueba]`
const NEW_TITLE = '[Prueba] Sorteo gratis · Glock-18 | Block-18';
const NEW_DESCRIPTION =
  'Sorteo de prueba para validar el flujo — el premio se entregará normalmente.';
// 2026-07-31 23:59:59 Europe/Madrid == 21:59:59Z en verano (CEST = UTC+2).
const NEW_ENDS_AT = new Date('2026-07-31T21:59:59.000Z');

async function main() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('DATABASE_URL no está definido. Aborto.');
    process.exit(1);
  }
  const sql = neon(dbUrl);

  const existingRows = await sql`
    SELECT id, title, description, status, ends_at AS "endsAt"
    FROM giveaways
    WHERE id = ${GIVEAWAY_ID}
  ` as Array<{ id: number; title: string; description: string | null; status: string; endsAt: Date | null }>;

  const existing = existingRows[0];
  if (!existing) {
    console.error(`No existe giveaway id=${GIVEAWAY_ID}. Aborto.`);
    process.exit(1);
  }
  if (!existing.title.includes(CANONICAL_TITLE_PREFIX)) {
    console.error(`El título de id=${GIVEAWAY_ID} ha cambiado (${existing.title}) — no coincide con ${CANONICAL_TITLE_PREFIX}. Aborto por seguridad.`);
    process.exit(1);
  }

  console.log('Antes:', {
    id: existing.id,
    title: existing.title,
    description: existing.description,
    status: existing.status,
    endsAt: existing.endsAt instanceof Date ? existing.endsAt.toISOString() : existing.endsAt,
  });

  const updatedRows = await sql`
    UPDATE giveaways
    SET title = ${NEW_TITLE},
        description = ${NEW_DESCRIPTION},
        status = 'active',
        ends_at = ${NEW_ENDS_AT.toISOString()},
        updated_at = NOW()
    WHERE id = ${GIVEAWAY_ID}
      AND status IN ('active', 'ended')
    RETURNING id, title, description, status, ends_at AS "endsAt"
  ` as Array<{ id: number; title: string; description: string | null; status: string; endsAt: Date | null }>;

  const updated = updatedRows[0];
  if (!updated) {
    console.error('UPDATE devolvió 0 filas. Aborto.');
    process.exit(1);
  }

  console.log('Después:', {
    id: updated.id,
    title: updated.title,
    description: updated.description,
    status: updated.status,
    endsAt: updated.endsAt instanceof Date ? updated.endsAt.toISOString() : updated.endsAt,
  });
  console.log('\n✅ Sorteo reactivado hasta 2026-07-31 23:59 Europe/Madrid.');
}

main().catch((e) => { console.error(e); process.exit(1); });
