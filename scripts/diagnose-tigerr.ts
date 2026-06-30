/**
 * Diagnóstico del perfil público de Tigerr.
 * Uso: npx tsx --env-file=.env.local scripts/diagnose-tigerr.ts
 */
import { neon } from '@neondatabase/serverless';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL no definida. Ejecuta con: npx tsx --env-file=.env.local scripts/diagnose-tigerr.ts');
  process.exit(1);
}

const sql = neon(DATABASE_URL);

async function main() {
  const rows = await sql`
    SELECT id, slug, name, is_published, show_in_roster, visibility, archived_at
    FROM talents
    WHERE slug ILIKE '%tigerr%' OR name ILIKE '%tigerr%'
    ORDER BY name
  `;

  if (rows.length === 0) {
    console.log('NO ROWS FOUND — el talent no existe en la DB con ese slug/nombre');
    return;
  }

  for (const row of rows) {
    console.log('\n--- Talent ---');
    console.log('id:           ', row.id);
    console.log('slug:         ', row.slug);
    console.log('name:         ', row.name);
    console.log('isPublished:  ', row.is_published);
    console.log('showInRoster: ', row.show_in_roster);
    console.log('visibility:   ', row.visibility);
    console.log('archivedAt:   ', row.archived_at);

    const issues: string[] = [];
    if (!row.is_published) issues.push('is_published=false → getTalentBySlug filtra y devuelve undefined → notFound()');
    if (row.archived_at) issues.push(`archived_at="${row.archived_at}" → filtrado por isNull(archivedAt) → notFound()`);
    if (row.slug !== 'tigerr') issues.push(`slug mismatch: DB tiene "${row.slug}", URL espera "tigerr"`);

    if (issues.length === 0) {
      console.log('\nSTATUS: ✅ Debería cargarse en /talentos/tigerr');
    } else {
      console.log('\nSTATUS: ❌ La página devuelve 404 porque:');
      for (const issue of issues) console.log('  -', issue);
    }
  }
}

main().catch(console.error).finally(() => process.exit(0));
