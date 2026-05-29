/**
 * seed-jolu-stats.ts — inserta las métricas públicas de JOLU en talent_stats
 * Run: npx tsx scripts/seed-jolu-stats.ts
 * Requiere DATABASE_URL en .env.local
 */

import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { eq } from 'drizzle-orm';
import * as schema from '../src/db/schema/index';

import { readFileSync } from 'fs';
import { join } from 'path';
try {
  const envPath = join(process.cwd(), '.env.local');
  const envFile = readFileSync(envPath, 'utf8');
  for (const line of envFile.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
    if (key && val && !process.env[key]) process.env[key] = val;
  }
} catch { /* .env.local puede no existir */ }

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL no configurado. Añádelo a .env.local primero.');
  process.exit(1);
}

const sql = neon(DATABASE_URL);
const db  = drizzle(sql, { schema });

const STATS: Array<{ icon: string; label: string; value: string; sortOrder: number }> = [
  { icon: '📺', label: 'Suscriptores YouTube', value: '9.63K', sortOrder: 0 },
  { icon: '▶️', label: 'Vídeos',               value: '145',   sortOrder: 1 },
  { icon: '👁️', label: 'Views medias',         value: '3.7K',  sortOrder: 2 },
];

async function main(): Promise<void> {
  const rows = await db
    .select({ id: schema.talents.id })
    .from(schema.talents)
    .where(eq(schema.talents.slug, 'jolu'))
    .limit(1);

  const talent = rows[0];
  if (!talent) {
    console.error('Talent con slug "jolu" no encontrado.');
    process.exit(1);
  }

  console.log(`Talent JOLU encontrado (id=${talent.id}). Insertando stats…`);

  // Borra las filas existentes para ser idempotente
  await db.delete(schema.talentStats).where(eq(schema.talentStats.talentId, talent.id));

  for (const s of STATS) {
    await db.insert(schema.talentStats).values({ talentId: talent.id, ...s });
    console.log(`  ✓ ${s.icon} ${s.label}: ${s.value}`);
  }

  console.log('Stats de JOLU insertados correctamente.');
}

main().catch((err) => { console.error(err); process.exit(1); });
