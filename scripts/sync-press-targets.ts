/**
 * Sync de press targets desde la skill del proyecto `.claude/skills/socialpro-press-targets/targets.md`
 * a la tabla `press_targets` en Neon.
 *
 * Triggered por el hook pre-push de Husky. Soft-fail por diseño: si la skill no existe,
 * DATABASE_URL no está, o Neon falla → exit 0 (no bloquear el push).
 *
 * Sincroniza solo las filas bajo las 6 secciones `## Curados — ...`. Pendientes y Rechazados
 * permanecen en el markdown como cola del operador.
 *
 * Idempotente vía mtime cache: si `targets.md` no cambió desde el último sync OK, exit temprano
 * sin tocar la DB. Cache: `node_modules/.cache/sync-press-targets-mtime`.
 */

import { config } from 'dotenv';
import { mkdirSync, readFileSync, statSync, writeFileSync } from 'fs';
import { join } from 'path';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { sql } from 'drizzle-orm';
import { pressTargets } from '../src/db/schema';

config({ path: join(process.cwd(), '.env.local') });

const SKILL_TARGETS_PATH = join(
  process.cwd(),
  '.claude',
  'skills',
  'socialpro-press-targets',
  'targets.md',
);

const CACHE_DIR = join(process.cwd(), 'node_modules', '.cache');
const CACHE_FILE = join(CACHE_DIR, 'sync-press-targets-mtime');

const SECTION_TO_CATEGORY: Record<string, Category> = {
  'Gaming Generalista':         'gaming-generalista',
  'CS2 / FPS Hispano':          'cs2-fps',
  'iGaming / Skins / Gambling': 'igaming-skins',
  'Prensa Digital Local':       'prensa-local',
  'Foros y Comunidades':        'foro',
  'Periodistas Individuales':   'periodista',
};

type Category =
  | 'gaming-generalista'
  | 'cs2-fps'
  | 'igaming-skins'
  | 'prensa-local'
  | 'foro'
  | 'periodista';

type ParsedRow = {
  domain: string;
  name: string;
  url: string;
  region: string;
  submission: string;
  summary: string | null;
  category: Category;
  validatedAt: Date | null;
};

function extractDomain(rawUrl: string): string | null {
  try {
    const u = new URL(rawUrl);
    return u.hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return null;
  }
}

function isHeaderRow(line: string): boolean {
  return /^\|\s*(Nombre|---)/i.test(line.trim());
}

function parseTargetsMd(content: string): ParsedRow[] {
  const byDomain = new Map<string, ParsedRow>();
  let currentCategory: Category | null = null;

  for (const rawLine of content.split('\n')) {
    const line = rawLine ?? '';

    const sectionMatch = line.match(/^##\s+Curados\s+—\s+(.+?)\s*$/);
    if (sectionMatch && sectionMatch[1]) {
      currentCategory = SECTION_TO_CATEGORY[sectionMatch[1].trim()] ?? null;
      continue;
    }
    if (line.match(/^##\s/)) {
      currentCategory = null;
      continue;
    }
    if (!currentCategory) continue;

    const trimmed = line.trim();
    if (!trimmed.startsWith('|') || isHeaderRow(trimmed)) continue;

    const cells = line.split('|').slice(1, -1).map((c) => c.trim());
    if (cells.length < 6) continue;

    const [name, url, region, submission, summary, validado] = cells;
    if (!name || !url) continue;

    const domain = extractDomain(url);
    if (!domain) continue;

    const validatedAt = validado && /^\d{4}-\d{2}-\d{2}$/.test(validado)
      ? new Date(`${validado}T00:00:00Z`)
      : null;

    byDomain.set(domain, {
      domain,
      name,
      url,
      region: region || 'ES/LATAM',
      submission: submission || '?',
      summary: summary && summary.length > 0 ? summary : null,
      category: currentCategory,
      validatedAt,
    });
  }

  return [...byDomain.values()];
}

async function main(): Promise<void> {
  let currentMtime: number;
  try {
    currentMtime = statSync(SKILL_TARGETS_PATH).mtimeMs;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      console.log(`[sync:press] No skill data en ${SKILL_TARGETS_PATH} — skip.`);
      return;
    }
    throw err;
  }

  let lastMtime = 0;
  try {
    lastMtime = Number(readFileSync(CACHE_FILE, 'utf8').trim()) || 0;
  } catch {
    // no cache yet
  }

  if (currentMtime === lastMtime) {
    console.log('[sync:press] targets.md sin cambios — skip.');
    return;
  }

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.log('[sync:press] DATABASE_URL no configurado — skip.');
    return;
  }

  const content = readFileSync(SKILL_TARGETS_PATH, 'utf8');
  const parsed = parseTargetsMd(content);

  if (parsed.length === 0) {
    console.log('[sync:press] 0 curados en skill markdown — skip.');
    return;
  }

  const db = drizzle(neon(dbUrl), { schema: { pressTargets } });

  const result = await db
    .insert(pressTargets)
    .values(parsed)
    .onConflictDoUpdate({
      target: pressTargets.domain,
      set: {
        name:        sql`EXCLUDED.name`,
        url:         sql`EXCLUDED.url`,
        region:      sql`EXCLUDED.region`,
        submission:  sql`EXCLUDED.submission`,
        summary:     sql`EXCLUDED.summary`,
        category:    sql`EXCLUDED.category`,
        validatedAt: sql`EXCLUDED.validated_at`,
        updatedAt:   sql`NOW()`,
      },
    })
    .returning({ id: pressTargets.id, xmax: sql<string>`xmax::text` });

  const inserted = result.filter((r) => r.xmax === '0').length;
  const updated = result.length - inserted;

  mkdirSync(CACHE_DIR, { recursive: true });
  writeFileSync(CACHE_FILE, String(currentMtime));

  console.log(`[sync:press] OK — ${inserted} nuevos, ${updated} actualizados (${parsed.length} curados).`);
}

main().catch((err) => {
  const msg = err instanceof Error ? err.message : String(err);
  console.error(`[sync:press] Fatal: ${msg}`);
  // exit 0 — soft-fail para no bloquear push
});
