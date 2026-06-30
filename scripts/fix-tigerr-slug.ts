/**
 * One-off fix: corrige el slug de TIGERR de "tiger" a "tigerr".
 *
 * El admin form no permite editar el slug (solo se setea via slugify(name)
 * en createTalentAction), así que este script aplica el cambio directamente
 * en DB de forma controlada y gateada.
 *
 * Uso: npx tsx --env-file=.env.local scripts/fix-tigerr-slug.ts
 *
 * Salvaguardas:
 *  - UPDATE gateado por id=224 AND slug='tiger' (idempotente)
 *  - Si el slug ya es 'tigerr', no hace nada (re-run safe)
 *  - Verifica que no exista colisión con un slug 'tigerr' previo
 */
import { neon } from '@neondatabase/serverless';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL no definida. Ejecuta con: npx tsx --env-file=.env.local scripts/fix-tigerr-slug.ts');
  process.exit(1);
}

const sql = neon(DATABASE_URL);
const TIGERR_ID = 224;

async function main() {
  console.log('--- Pre-check ---');
  const before = await sql`
    SELECT id, name, slug, is_published, show_in_roster, visibility, archived_at
    FROM talents
    WHERE slug IN ('tiger', 'tigerr') OR name ILIKE '%tigerr%'
    ORDER BY id
  `;
  for (const row of before) {
    console.log(`id=${row.id} | slug="${row.slug}" | name="${row.name}" | is_published=${row.is_published} | show_in_roster=${row.show_in_roster} | archived_at=${row.archived_at}`);
  }

  const tiger    = before.find((r) => r.id === TIGERR_ID && r.slug === 'tiger');
  const tigerr   = before.find((r) => r.slug === 'tigerr');

  if (tigerr && tigerr.id !== TIGERR_ID) {
    console.error(`❌ ABORT: ya existe otro talent con slug "tigerr" (id=${tigerr.id}). Resolver colisión manualmente.`);
    process.exit(1);
  }

  if (!tiger && tigerr?.id === TIGERR_ID) {
    console.log('✅ El slug ya es "tigerr" — no hay nada que hacer.');
    return;
  }

  if (!tiger) {
    console.error(`❌ ABORT: no se encontró talent con id=${TIGERR_ID} y slug="tiger". Estado inesperado.`);
    process.exit(1);
  }

  console.log('\n--- UPDATE ---');
  const result = await sql`
    UPDATE talents
    SET slug = 'tigerr', updated_at = NOW()
    WHERE id = ${TIGERR_ID} AND slug = 'tiger'
    RETURNING id, name, slug
  `;
  console.log(`Filas actualizadas: ${result.length}`);
  for (const row of result) {
    console.log(`  → id=${row.id} | slug="${row.slug}" | name="${row.name}"`);
  }

  console.log('\n--- Post-check ---');
  const after = await sql`SELECT id, name, slug FROM talents WHERE id = ${TIGERR_ID}`;
  for (const row of after) {
    console.log(`id=${row.id} | slug="${row.slug}" | name="${row.name}"`);
  }

  if (after[0]?.slug === 'tigerr') {
    console.log('\n✅ OK — slug actualizado correctamente.');
  } else {
    console.error('\n❌ ERROR — el slug no quedó como "tigerr".');
    process.exit(1);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
