/**
 * seed-tags.ts — sincroniza talent_tags para todos los talentos
 * Borra los tags existentes de cada talento y los reinserta desde la fuente de verdad.
 * Run: npx tsx scripts/seed-tags.ts
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
    const val = trimmed.slice(eqIdx + 1).trim();
    if (key && val && !process.env[key]) process.env[key] = val;
  }
} catch { /* .env.local puede no existir en CI */ }

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL no configurado. Rellena .env.local primero.');
  process.exit(1);
}

const sql = neon(DATABASE_URL);
const db = drizzle(sql, { schema });

// Fuente de verdad de etiquetas por slug
// HuasoPeek: sin Valorant (es jugador de CS2, no de Valorant)
const TALENT_TAGS: Record<string, string[]> = {
  todocs2:      ['CS2', 'FPS Competitivo', 'Twitch', 'España'],
  deqiuv:       ['CS2', 'Valorant', 'FPS', 'Twitch'],
  adams:        ['YouTube', 'Gaming', 'FPS', 'Contenido'],
  mecha:        ['CS2', 'Esports', 'Competitivo', 'Twitch'],
  huasopeek:   ['CS2', 'LatAm', 'Twitch', 'FPS'],
  rinna:        ['Gaming', 'Lifestyle', 'YouTube', 'Twitch'],
  martinez:     ['Esports', 'Variety', 'Twitch', 'Competitivo'],
  vityshow:     ['Gaming', 'Twitch', 'Disponible'],
  sofffi:       ['CS2', 'FPS', 'Twitch'],
  naow:         ['Gaming', 'YouTube', 'Variety'],
  yamisanchezz: ['CS2', 'FPS', 'Twitch'],
  eruby:        ['CS2', 'YouTube', 'Skins', 'Gaming'],
};

async function main() {
  console.log('Sincronizando etiquetas de talentos...\n');

  for (const [slug, tags] of Object.entries(TALENT_TAGS)) {
    const talent = await db.query.talents.findFirst({
      where: eq(schema.talents.slug, slug),
      columns: { id: true, name: true },
    });

    if (!talent) {
      console.log(`  ⚠  ${slug} — no encontrado en DB, omitido`);
      continue;
    }

    // Borrar tags existentes
    await db.delete(schema.talentTags).where(eq(schema.talentTags.talentId, talent.id));

    // Insertar tags correctos
    await db.insert(schema.talentTags).values(
      tags.map((tag) => ({ talentId: talent.id, tag })),
    );

    console.log(`  ✅  ${talent.name.padEnd(16)} → ${tags.join(', ')}`);
  }

  console.log('\nListo.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
