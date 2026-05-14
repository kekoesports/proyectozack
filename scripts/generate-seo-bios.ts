/**
 * generate-seo-bios.ts — CLI de generación de bios SEO en batch.
 *
 * REQUISITO: GEMINI_API_KEY en .env.local (cópiala de Vercel Dashboard → Settings → Env Vars)
 *
 * npm run seo:preview              → vista previa de 7 perfiles clave, sin guardar
 * npm run seo:save                 → guarda los 7 como status=generated
 * npm run seo:batch                → batch de todos los perfiles pendientes (limit=20)
 * npm run seo:batch -- --limit=5  → batch limitado
 *
 * Opciones directas:
 *   --slug=todocs2   solo un talento
 *   --force          regenerar aunque no hayan cambiado los datos
 *   --limit=N        máximo N perfiles (solo en batch)
 *   --save           guardar en DB
 *   --batch          procesar todos los pendientes (sin approved)
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { neon } from '@neondatabase/serverless';
import { GoogleGenerativeAI } from '@google/generative-ai';
import {
  computeFingerprint, checkSimilarity, cleanKeywords,
  DEFAULT_OPTIONS, generateOneBio, qualityLabel,
  type BioBatchInput, type BioBatchResult,
} from '../src/lib/seo/biosBatch';

// ── Env ───────────────────────────────────────────────────────────────────────
try {
  const f = readFileSync(join(process.cwd(), '.env.local'), 'utf8');
  for (const line of f.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx < 0) continue;
    const key = trimmed.slice(0, idx).trim();
    let val = trimmed.slice(idx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
    if (key && val && !process.env[key]) process.env[key] = val;
  }
} catch { /* no .env.local */ }

// ── Config ────────────────────────────────────────────────────────────────────
const GEMINI_API_KEY = process.env.GEMINI_API_KEY ?? '';
const DATABASE_URL   = process.env.DATABASE_URL ?? '';

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL no configurado en .env.local');
  process.exit(1);
}
if (!GEMINI_API_KEY) {
  console.error(`
❌ GEMINI_API_KEY no encontrada en .env.local

Para obtenerla:
  1. Ve a Vercel Dashboard → tu proyecto → Settings → Environment Variables
  2. Copia el valor de GEMINI_API_KEY
  3. Añade al .env.local:
       GEMINI_API_KEY=AIza...

La key nunca sale de tu máquina. Solo se usa en este script local.
`);
  process.exit(1);
}

// CLI args
const args           = process.argv.slice(2);
const SAVE_TO_DB     = args.includes('--save');
const BATCH_MODE     = args.includes('--batch');
const FORCE          = args.includes('--force');
const SLUG_FILTER    = args.find(a => a.startsWith('--slug='))?.split('=')[1];
const LIMIT          = parseInt(args.find(a => a.startsWith('--limit='))?.split('=')[1] ?? '20', 10);

// Perfiles clave para preview/save
const CURATED_SLUGS = [
  'todocs2',       // Big · CS2 · brands + giveaways
  'deqiuv',        // Big · CS2+Valorant · Twitch gigante
  'hetta',         // Medium · CS2 · YouTube fuerte post-sync
  'gordoreally',   // Medium · CS2 · Twitch dominante + brand
  'eruby',         // Medium · CS2 · datos escasos → stress test
  'jolu',          // Small · CS2 · YouTube + brands
  'naow',          // NON-CS2 · Gaming/Variety · brands + giveaway
];

// ── Data fetching ─────────────────────────────────────────────────────────────

async function fetchBatchInputs(
  sql: ReturnType<typeof neon>,
  slugFilter?: string,
  batchMode = false,
  limit = 20,
): Promise<BioBatchInput[]> {
  type TalentRow = {
    id: number; slug: string; name: string; role: string; role2: string | null;
    game: string; platform: string; bio: string | null; bio_long: string | null;
    creator_country: string | null; audience_language: string | null;
    top_geos: Array<{ country: string; pct: number }> | null;
    highlights: string[] | null; seo_bio_status: string;
    seo_bio_manual: string | null; seo_keywords: string[] | null;
    last_stats_update_at: Date | null; tags: string[];
  };
  type SocialRow = { talent_id: number; platform: string; followers_display: string; platform_id: string | null };
  type CodeRow   = { talent_id: number; brand_name: string };
  type CountRow  = { talent_id: number; n: string };

  let slugs: string[];
  if (slugFilter) {
    slugs = [slugFilter];
  } else if (batchMode) {
    const pending = await sql`
      SELECT slug FROM talents
      WHERE is_published = true AND seo_bio_status != 'approved'
      ORDER BY sort_order ASC
      LIMIT ${limit}
    `;
    slugs = (pending as { slug: string }[]).map(r => r.slug);
  } else {
    slugs = CURATED_SLUGS;
  }

  if (slugs.length === 0) {
    console.log('✅ No hay perfiles pendientes de bio.');
    return [];
  }

  const [talents, socials, codes, giveaways, campaigns] = await Promise.all([
    sql`
      SELECT t.id, t.slug, t.name, t.role, t.role2, t.game, t.platform,
             t.bio, t.bio_long, t.creator_country, t.audience_language,
             t.top_geos, t.highlights, t.seo_bio_status, t.seo_bio_manual,
             t.seo_keywords, t.last_stats_update_at,
             COALESCE(array_agg(DISTINCT tt.tag) FILTER (WHERE tt.id IS NOT NULL), '{}') AS tags
      FROM talents t
      LEFT JOIN talent_tags tt ON tt.talent_id = t.id
      WHERE t.slug = ANY(${slugs})
      GROUP BY t.id
      ORDER BY array_position(${slugs}::text[], t.slug)
    ` as Promise<TalentRow[]>,

    sql`SELECT talent_id, platform, followers_display, platform_id
        FROM talent_socials
        WHERE talent_id IN (SELECT id FROM talents WHERE slug = ANY(${slugs}))
    ` as Promise<SocialRow[]>,

    sql`SELECT talent_id, brand_name FROM creator_codes
        WHERE talent_id IN (SELECT id FROM talents WHERE slug = ANY(${slugs}))
    ` as Promise<CodeRow[]>,

    sql`SELECT talent_id, COUNT(*) AS n FROM giveaways
        WHERE talent_id IN (SELECT id FROM talents WHERE slug = ANY(${slugs}))
          AND (ends_at IS NULL OR ends_at > NOW())
        GROUP BY talent_id
    ` as Promise<CountRow[]>,

    sql`SELECT talent_id, COUNT(*) AS n FROM campaigns
        WHERE talent_id IN (SELECT id FROM talents WHERE slug = ANY(${slugs}))
        GROUP BY talent_id
    ` as Promise<CountRow[]>,
  ]);

  return talents.map((t): BioBatchInput => ({
    id:               t.id,
    slug:             t.slug,
    name:             t.name,
    role:             t.role,
    role2:            t.role2,
    game:             t.game,
    platform:         t.platform,
    bio:              t.bio,
    bioLong:          t.bio_long,
    tags:             t.tags ?? [],
    creatorCountry:   t.creator_country,
    audienceLanguage: t.audience_language,
    topGeos:          t.top_geos as Array<{ country: string; pct: number }> | null,
    highlights:       t.highlights,
    seoBioStatus:     t.seo_bio_status,
    seoBioManual:     t.seo_bio_manual,
    seoKeywords:      t.seo_keywords,
    lastStatsUpdateAt: t.last_stats_update_at,
    socials:          socials.filter(s => s.talent_id === t.id).map(s => ({
      platform: s.platform, followersDisplay: s.followers_display, platformId: s.platform_id,
    })),
    activeBrands:    [...new Set(codes.filter(c => c.talent_id === t.id && c.brand_name).map(c => c.brand_name))],
    activeGiveaways: parseInt(giveaways.find(g => g.talent_id === t.id)?.n ?? '0', 10),
    campaignCount:   parseInt(campaigns.find(c => c.talent_id === t.id)?.n ?? '0', 10),
  }));
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const sql   = neon(DATABASE_URL);
  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  const opts = { ...DEFAULT_OPTIONS, force: FORCE };

  const modeLabel = SAVE_TO_DB ? '✏️  GUARDAR (status=generated)' : '🔍 VISTA PREVIA (sin DB)';
  const typeLabel = SLUG_FILTER ? `slug:${SLUG_FILTER}` : BATCH_MODE ? `batch (limit:${LIMIT})` : `curated (${CURATED_SLUGS.length} perfiles)`;
  console.log(`\n${'═'.repeat(72)}`);
  console.log(`SEO Bios V2 | ${typeLabel} | ${modeLabel}${FORCE ? ' | FORCE' : ''}`);
  console.log(`${'═'.repeat(72)}\n`);

  // Fetch
  const inputs = await fetchBatchInputs(sql, SLUG_FILTER, BATCH_MODE, LIMIT);
  if (inputs.length === 0) return;
  console.log(`Perfiles a procesar: ${inputs.length}\n`);

  const results: BioBatchResult[] = [];

  for (const input of inputs) {
    const fp = computeFingerprint(input);
    console.log(`${'─'.repeat(72)}`);
    const syncStatus = input.socials
      .map(s => `${s.platform}:${s.followersDisplay}${s.platformId ? '✓' : '⚠'}`)
      .join(' ');
    console.log(`📍 ${input.slug.toUpperCase()} | ${input.game} | ${input.platform}`);
    console.log(`   ${syncStatus}`);
    console.log(`   Brands:${input.activeBrands.join('+') || '—'} Giveaways:${input.activeGiveaways} Camps:${input.campaignCount}`);
    console.log(`   FP:${fp} status:${input.seoBioStatus}`);

    process.stdout.write(`   Generando... `);
    const t0 = Date.now();

    const result = await generateOneBio(input, model, opts, (msg) => console.log(`\n   ${msg}`));
    const elapsed = Date.now() - t0;

    if (result.skipped) {
      console.log(`⏭  Saltado: ${result.skipReason}`);
      results.push(result);
      continue;
    }

    console.log(`✅ ${elapsed}ms | ${result.bio.trim().split(/\s+/).length}w | ${qualityLabel(result.qualityScore)} (${result.qualityScore}/100)`);

    // Display output
    console.log(`\n   TITLE (${result.seoTitle.length}c): ${result.seoTitle}`);
    console.log(`   DESC  (${result.seoDesc.length}c): ${result.seoDesc}`);
    console.log(`\n   BIO:`);
    result.bio.split('\n\n').forEach(p => console.log(`   ${p}`));
    console.log(`\n   KEYWORDS: ${cleanKeywords(result.keywords).join(', ')}`);

    if (result.issues.length > 0) {
      console.log(`\n   GUARDRAILS:`);
      result.issues.forEach(i => console.log(`   ${i}`));
    }

    results.push(result);
    await new Promise(r => setTimeout(r, 1000));
  }

  // Similarity check
  const generated = results.filter(r => !r.skipped && r.bio);
  if (generated.length > 1) {
    console.log(`\n${'═'.repeat(72)}`);
    console.log('ANÁLISIS DE SIMILITUD');
    const pairs = checkSimilarity(
      generated.map(r => ({ slug: r.slug, bio: r.bio })),
      opts.similarityWarn, opts.similarityBlock,
    );
    if (pairs.length === 0) {
      console.log('✅ Todas las bios son suficientemente distintas.');
    } else {
      for (const p of pairs) {
        const tag = p.block ? '🚨 BLOQUEO' : '⚠  AVISO';
        console.log(`${tag} ${p.a} ↔ ${p.b}: ${(p.score * 100).toFixed(1)}%`);
      }
    }
    const hasBlock = pairs.some(p => p.block);

    if (SAVE_TO_DB && hasBlock) {
      console.log(`\n🚨 GUARDADO CANCELADO — similitud demasiado alta entre bios.`);
      console.log(`   Regenera con --force o revisa manualmente.`);
      process.exit(1);
    }
  }

  // Summary
  const succeeded = results.filter(r => !r.skipped && r.bio);
  const skipped   = results.filter(r => r.skipped);
  const failed    = results.filter(r => !r.skipped && !r.bio);

  console.log(`\n${'═'.repeat(72)}`);
  console.log('RESUMEN');
  console.log(`${'═'.repeat(72)}`);
  console.log(`Generadas: ${succeeded.length} | Saltadas: ${skipped.length} | Fallidas: ${failed.length}`);
  for (const r of results) {
    if (r.skipped) {
      console.log(`  ⏭  ${r.slug.padEnd(16)} ${r.skipReason}`);
    } else if (!r.bio) {
      console.log(`  ❌  ${r.slug.padEnd(16)} FALLIDO`);
    } else {
      const wc = r.bio.trim().split(/\s+/).length;
      console.log(`  ${r.issues.length ? '⚠ ' : '✅'} ${r.slug.padEnd(16)} ${wc}w | ${qualityLabel(r.qualityScore)} (${r.qualityScore}/100) | ${r.issues.length} issues`);
    }
  }

  // Save
  if (SAVE_TO_DB && succeeded.length > 0) {
    console.log(`\nGuardando ${succeeded.length} bios en DB...`);
    for (const r of succeeded) {
      await sql`
        UPDATE talents SET
          seo_bio_generated = ${r.bio},
          seo_title         = ${r.seoTitle},
          seo_description   = ${r.seoDesc},
          seo_keywords      = ${r.keywords},
          seo_bio_status    = 'generated'
        WHERE slug = ${r.slug}
      `;
      console.log(`  ✅ ${r.slug} guardado (status=generated, pendiente revisión humana)`);
    }
    console.log(`\n🔒 Aprobación manual requerida en /admin/talents/{id}/seo`);
  } else if (!SAVE_TO_DB) {
    console.log(`\nPara guardar: npm run seo:save  (o add --save)`);
  }

  console.log(`${'═'.repeat(72)}\n`);
}

main().catch(err => { console.error('\nError fatal:', err); process.exit(1); });
