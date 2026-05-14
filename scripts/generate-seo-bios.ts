/**
 * generate-seo-bios.ts — Genera bios SEO V2 para los talentos seleccionados.
 *
 * INSTRUCCIONES:
 *   1. Asegúrate de tener en .env.local:
 *        GEMINI_API_KEY=AIza...  (copiada de Vercel Dashboard → Settings → Env Vars)
 *        DATABASE_URL=...        (ya debería estar)
 *   2. Ejecutar en vista previa (NO guarda en DB):
 *        npx tsx scripts/generate-seo-bios.ts
 *   3. Si los textos son buenos, guardar como borrador:
 *        npx tsx scripts/generate-seo-bios.ts --save
 *   4. Solo un talento:
 *        npx tsx scripts/generate-seo-bios.ts --slug=todocs2
 *
 * La key NUNCA sale de tu máquina. El script la lee de .env.local.
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { neon } from '@neondatabase/serverless';
import { GoogleGenerativeAI } from '@google/generative-ai';

// ── Env ───────────────────────────────────────────────────────────────────────
try {
  const envPath = join(process.cwd(), '.env.local');
  const envFile = readFileSync(envPath, 'utf8');
  for (const line of envFile.split('\n')) {
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

const GEMINI_API_KEY = process.env.GEMINI_API_KEY ?? '';
const DATABASE_URL   = process.env.DATABASE_URL ?? '';
const SAVE_TO_DB     = process.argv.includes('--save');
const SLUG_FILTER    = process.argv.find(a => a.startsWith('--slug='))?.split('=')[1];

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL no configurado en .env.local');
  process.exit(1);
}
if (!GEMINI_API_KEY) {
  console.error('❌ GEMINI_API_KEY no encontrada en .env.local');
  console.error('   Añade: GEMINI_API_KEY=AIza...  (cópiala de Vercel Dashboard → Settings → Env Vars)');
  process.exit(1);
}

// ── Perfiles objetivo ─────────────────────────────────────────────────────────
const TARGET_SLUGS = SLUG_FILTER ? [SLUG_FILTER] : [
  'todocs2',       // Big · CS2 · brands + giveaways
  'deqiuv',        // Big · CS2+Valorant · Twitch gigante
  'hetta',         // Medium · CS2 · YouTube fuerte post-sync
  'gordoreally',   // Medium · CS2 · Twitch dominante + brand
  'eruby',         // Medium · CS2 · datos escasos → stress test calidad
  'jolu',          // Small · CS2 · YouTube + brands
  'naow',          // NON-CS2 · Gaming/Variety · brands + giveaway
];

// ── Guardrails ────────────────────────────────────────────────────────────────

const FORBIDDEN_PHRASES = [
  'el mejor', 'la mejor', 'el más popular', 'la más popular',
  'líder indiscutible', 'referente absoluto', 'el streamer más',
  'número uno', 'número 1', 'el más seguido', 'la más seguida',
  'top streamer', 'mayor streamer',
];
const TOURNAMENT_PATTERNS = [
  /ganó (el|la|un|una)/i, /campeón (de|en)/i, /finalista en/i,
  /subcampeón/i, /primer puesto/i, /clasificó (para|en)/i,
  /quedó (primero|segundo|tercero)/i, /ganador de/i,
];
const UNVERIFIED_BRANDS = ['razer', 'logitech', 'corsair', 'steelseries', 'bet365', 'betway', '1xbet', 'betwinner', 'bwin', 'sportingbet'];

function detectIssues(text: string, knownBrands: string[]): string[] {
  const lower = text.toLowerCase();
  const issues: string[] = [];
  const knownLower = knownBrands.map(b => b.toLowerCase());

  const forbidden = FORBIDDEN_PHRASES.filter(p => lower.includes(p));
  if (forbidden.length) issues.push(`⚠  Frases absolutas: "${forbidden.join('", "')}"`);

  if (TOURNAMENT_PATTERNS.some(p => p.test(text))) {
    issues.push('🚨 Posible mención de torneos/logros no verificados');
  }

  const inventedBrands = UNVERIFIED_BRANDS.filter(b =>
    lower.includes(b) && !knownLower.some(k => k.includes(b))
  );
  if (inventedBrands.length) issues.push(`⚠  Marcas no verificadas en input: ${inventedBrands.join(', ')}`);

  return issues;
}

// ── Similitud entre bios (Jaccard sobre bigramas) ─────────────────────────────

function tokenize(text: string): Set<string> {
  const words = text.toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 3); // skip stopwords cortas

  // Build bigrams for better phrase matching
  const bigrams = new Set<string>();
  for (let i = 0; i < words.length - 1; i++) {
    bigrams.add(`${words[i]}_${words[i + 1]}`);
  }
  words.forEach(w => bigrams.add(w));
  return bigrams;
}

function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  const intersection = new Set([...a].filter(x => b.has(x)));
  const union = new Set([...a, ...b]);
  return union.size === 0 ? 0 : intersection.size / union.size;
}

const SIMILARITY_WARN  = 0.35;  // warn if two bios share >35% tokens
const SIMILARITY_BLOCK = 0.50;  // block save if >50%

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

// ── Prompt V2 ─────────────────────────────────────────────────────────────────

function buildPrompt(d: {
  nombre: string; rol: string; rol2: string | null; juego: string; plataforma: string;
  bio: string | null; tags: string[]; socials: string;
  geos: string | null; pais: string | null; idioma: string | null;
  highlights: string[] | null; marcas: string[] | null;
  sorteos: number; campanas: number; bio_manual: string | null;
  twitch_sin_sync: boolean;
}): string {
  const twitchNote = d.twitch_sin_sync
    ? '\n⚠️  NOTA: Followers de Twitch NO verificados vía API. No los menciones o hazlo con precaución.'
    : '';

  const safeData = {
    nombre: d.nombre,
    rol_principal: d.rol,
    rol_secundario: d.rol2 ?? null,
    juego_categoria: d.juego,
    plataforma_principal: d.plataforma,
    bio_corta: d.bio,
    redes_sociales: d.socials,
    tags: d.tags,
    pais_creador: d.pais,
    mercados_audiencia: d.geos,
    idioma_audiencia: d.idioma,
    logros_destacados: d.highlights,
    marcas_activas_verificadas: d.marcas,
    sorteos_activos: d.sorteos > 0 ? d.sorteos : null,
    campanas_crm: d.campanas > 0 ? d.campanas : null,
    bio_manual_referencia: d.bio_manual ? d.bio_manual.slice(0, 250) : null,
  };

  return `Eres especialista SEO de gaming y esports. Genera contenido SEO DIFERENCIADO para "${d.nombre}", creador representado por SocialPro.

DATOS VERIFICADOS DEL CREADOR:
${JSON.stringify(safeData, null, 2)}
${twitchNote}

REGLAS NO NEGOCIABLES:
1. Bio entre 200 y 320 palabras, en español, tono natural y profesional.
2. DIFERENCIACIÓN OBLIGATORIA: este texto debe ser único para este creador. Usa datos específicos suyos. No rellenes con frases genéricas de "gran comunidad" o "contenido de calidad".
3. Menciona SOLO marcas que aparezcan en "marcas_activas_verificadas". Si es null, NO inventes ninguna.
4. Si "mercados_audiencia" es null, NO menciones distribución geográfica específica.
5. SocialPro = agencia de representación (máximo UNA mención natural).
6. PROHIBIDO: "el mejor", "referente", "número uno", logros competitivos, torneos, premios no confirmados.
7. Si los datos son escasos, sé honesto y conciso. No rellenes con frases vacías.
8. Si "bio_manual_referencia" existe, úsala como guía de tono, NO la copies.
9. seoTitle < 65 chars: nombre + rol + plataforma/juego.
10. seoDescription < 155 chars: accionable, nombre + plataforma + juego, con CTA implícita.
11. keywords: 12-15 términos en español, variantes naturales, long-tail incluido.

Responde ÚNICAMENTE JSON sin markdown:
{"bio":"...","seoTitle":"...","seoDescription":"...","keywords":["..."]}`;
}

// ── Main ──────────────────────────────────────────────────────────────────────

type BioResult = {
  slug: string;
  name: string;
  bio: string;
  title: string;
  desc: string;
  keywords: string[];
  issues: string[];
  wc: number;
  tokens: Set<string>;
  contextSummary: string;
};

async function main() {
  const sql = neon(DATABASE_URL);
  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  const mode = SAVE_TO_DB ? '✏️  GUARDAR EN DB (status=generated)' : '🔍 SOLO VISTA PREVIA (sin escribir en DB)';
  console.log(`\n${'═'.repeat(72)}`);
  console.log(`SEO BIOS V2 — ${TARGET_SLUGS.length} perfiles | ${mode}`);
  console.log(`${'═'.repeat(72)}\n`);

  const results: BioResult[] = [];

  // ── Generación ────────────────────────────────────────────────────────────
  for (const slug of TARGET_SLUGS) {
    console.log(`\n${'─'.repeat(72)}`);
    console.log(`📍 ${slug.toUpperCase()}`);
    console.log(`${'─'.repeat(72)}`);

    const [talentRows, socialsRows, codesRows, giveawayRows, campaignRows] = await Promise.all([
      sql`
        SELECT t.*, array_agg(DISTINCT tt.tag) FILTER (WHERE tt.id IS NOT NULL) AS tags
        FROM talents t
        LEFT JOIN talent_tags tt ON tt.talent_id = t.id
        WHERE t.slug = ${slug}
        GROUP BY t.id`,
      sql`SELECT platform, followers_display, platform_id FROM talent_socials
          WHERE talent_id = (SELECT id FROM talents WHERE slug = ${slug})`,
      sql`SELECT DISTINCT brand_name FROM creator_codes
          WHERE talent_id = (SELECT id FROM talents WHERE slug = ${slug})`,
      sql`SELECT id FROM giveaways
          WHERE talent_id = (SELECT id FROM talents WHERE slug = ${slug})
            AND (ends_at IS NULL OR ends_at > NOW())`,
      sql`SELECT id FROM campaigns
          WHERE talent_id = (SELECT id FROM talents WHERE slug = ${slug})`,
    ]);

    const t = talentRows[0];
    if (!t) { console.log(`❌ Talento no encontrado: ${slug}\n`); continue; }

    const twitchRow   = socialsRows.find(s => s.platform === 'twitch');
    const youtubeRow  = socialsRows.find(s => s.platform === 'youtube');
    const twitchSinSync = !!twitchRow && !twitchRow.platform_id;

    const socialSummary = socialsRows
      .filter(s => s.followers_display && !['-','—',''].includes(s.followers_display))
      .map(s => {
        const sync = s.platform_id ? `✓ API` : `⚠ sin sync`;
        return `${s.platform}: ${s.followers_display} (${sync})`;
      }).join(' | ') || 'Sin métricas disponibles';

    const activeBrands = (codesRows as {brand_name: string}[]).map(c => c.brand_name).filter(Boolean);
    const geos = t.top_geos as Array<{country: string; pct: number}> | null;
    const tags = t.tags as string[] | null ?? [];

    // Contexto visible
    console.log(`Game: ${t.game} | Platform: ${t.platform} | Country: ${t.creator_country ?? '?'} | Lang: ${t.audience_language ?? '?'}`);
    console.log(`Socials: ${socialSummary}`);
    console.log(`Brands: ${activeBrands.join(', ') || '—'} | Giveaways: ${giveawayRows.length} | Campaigns: ${campaignRows.length}`);
    console.log(`Tags: ${tags.join(', ') || '—'}`);
    if (twitchSinSync) console.log(`⚠  Twitch sin sincronizar (sin platformId)`);
    if (!youtubeRow?.platform_id) console.log(`⚠  YouTube sin platformId`);
    console.log();

    const contextSummary = [
      `TW:${twitchRow?.followers_display ?? '—'}${twitchSinSync ? '(unsync)' : ''}`,
      `YT:${youtubeRow?.followers_display ?? '—'}`,
      activeBrands.length ? `brands:${activeBrands.join('+')}` : '',
      giveawayRows.length ? `giveaways:${giveawayRows.length}` : '',
    ].filter(Boolean).join(' ');

    // Generate
    process.stdout.write(`Generando con Gemini 2.0 Flash... `);
    const t0 = Date.now();

    let rawText = '';
    try {
      const res = await model.generateContent(buildPrompt({
        nombre:          t.name as string,
        rol:             t.role as string,
        rol2:            t.role2 as string | null,
        juego:           t.game as string,
        plataforma:      t.platform as string,
        bio:             t.bio as string | null,
        tags,
        socials:         socialSummary,
        geos:            geos?.length ? geos.map(g => `${g.country} ${g.pct}%`).join(', ') : null,
        pais:            t.creator_country as string | null,
        idioma:          t.audience_language as string | null,
        highlights:      t.highlights as string[] | null,
        marcas:          activeBrands.length ? activeBrands : null,
        sorteos:         giveawayRows.length,
        campanas:        campaignRows.length,
        bio_manual:      t.seo_bio_manual as string | null,
        twitch_sin_sync: twitchSinSync,
      }));
      rawText = res.response.text();
      console.log(`✅ ${Date.now() - t0}ms`);
    } catch (err) {
      console.log(`❌ ${(err as Error).message}`);
      continue;
    }

    // Parse JSON
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) { console.log('❌ Sin JSON en respuesta\n'); continue; }
    let parsed: { bio?: string; seoTitle?: string; seoDescription?: string; keywords?: string[] };
    try { parsed = JSON.parse(jsonMatch[0]); }
    catch { console.log('❌ JSON malformado\n'); continue; }

    const bio      = (parsed.bio ?? '').trim();
    const title    = (parsed.seoTitle ?? '').trim();
    const desc     = (parsed.seoDescription ?? '').trim();
    const keywords = parsed.keywords ?? [];
    const wc       = wordCount(bio);
    const issues   = detectIssues(bio, activeBrands);
    const tokens   = tokenize(bio);

    // Validaciones de longitud
    if (wc < 150) issues.push(`⚠  Bio corta: ${wc} palabras (mínimo 200)`);
    if (wc > 380) issues.push(`⚠  Bio larga: ${wc} palabras (máximo 320)`);
    if (title.length > 65) issues.push(`⚠  Title largo: ${title.length} chars (máx 65)`);
    if (desc.length > 155) issues.push(`⚠  Description larga: ${desc.length} chars (máx 155)`);

    results.push({ slug, name: t.name as string, bio, title, desc, keywords, issues, wc, tokens, contextSummary });

    // Display
    console.log(`\n  SEO TITLE (${title.length} chars)`);
    console.log(`  ${title || '(vacío)'}`);
    console.log(`\n  META DESCRIPTION (${desc.length} chars)`);
    console.log(`  ${desc || '(vacío)'}`);
    console.log(`\n  BIO (${wc} palabras)`);
    const lines = bio.split('\n\n');
    lines.forEach(l => console.log(`  ${l}`));
    console.log(`\n  KEYWORDS (${keywords.length})`);
    console.log(`  ${keywords.join(', ')}`);

    if (issues.length > 0) {
      console.log(`\n  GUARDRAILS:`);
      issues.forEach(i => console.log(`  ${i}`));
    } else {
      console.log(`\n  ✅ Sin guardrails disparados`);
    }

    console.log(`\n  CONTEXTO USADO: ${contextSummary}`);

    await new Promise(r => setTimeout(r, 1200)); // rate limit gentil
  }

  if (results.length === 0) {
    console.log('\n❌ No se generaron resultados.\n');
    return;
  }

  // ── Detección de similitud entre bios ────────────────────────────────────
  console.log(`\n${'═'.repeat(72)}`);
  console.log('ANÁLISIS DE SIMILITUD ENTRE BIOS');
  console.log(`${'═'.repeat(72)}`);

  let hasSimilarityBlock = false;
  const similarityPairs: Array<{a: string; b: string; score: number}> = [];

  for (let i = 0; i < results.length; i++) {
    for (let j = i + 1; j < results.length; j++) {
      const score = jaccardSimilarity(results[i].tokens, results[j].tokens);
      if (score >= SIMILARITY_WARN) {
        similarityPairs.push({ a: results[i].slug, b: results[j].slug, score });
        if (score >= SIMILARITY_BLOCK) hasSimilarityBlock = true;
      }
    }
  }

  if (similarityPairs.length === 0) {
    console.log('✅ Todas las bios son suficientemente distintas entre sí.');
  } else {
    for (const p of similarityPairs) {
      const level = p.score >= SIMILARITY_BLOCK ? '🚨 BLOQUEO' : '⚠ AVISO';
      console.log(`${level} ${p.a} ↔ ${p.b}: ${(p.score * 100).toFixed(1)}% similitud`);
      if (p.score >= SIMILARITY_BLOCK) {
        console.log(`   → Bios demasiado parecidas. Revisar antes de guardar.`);
      }
    }
  }

  // ── Resumen final ─────────────────────────────────────────────────────────
  const withIssues = results.filter(r => r.issues.length > 0);

  console.log(`\n${'═'.repeat(72)}`);
  console.log('RESUMEN');
  console.log(`${'═'.repeat(72)}`);
  console.log(`Perfiles generados: ${results.length}/${TARGET_SLUGS.length}`);
  console.log(`Con guardrails:     ${withIssues.length}`);
  console.log(`Pares similares:    ${similarityPairs.length}`);

  for (const r of results) {
    const flag = r.issues.length > 0 ? '⚠' : '✅';
    console.log(`  ${flag} ${r.slug.padEnd(16)} ${r.wc} palabras | ${r.title.length} chars title | ${r.contextSummary}`);
  }

  // ── Guardar en DB ─────────────────────────────────────────────────────────
  if (SAVE_TO_DB) {
    if (hasSimilarityBlock) {
      console.log(`\n🚨 NO SE GUARDA: hay pares con similitud > ${SIMILARITY_BLOCK * 100}%. Revisa y regenera antes de guardar.`);
      process.exit(1);
    }

    console.log(`\nGuardando en DB como status=generated...`);
    for (const r of results) {
      if (!r.bio) continue;
      await sql`
        UPDATE talents SET
          seo_bio_generated = ${r.bio},
          seo_title         = ${r.title},
          seo_description   = ${r.desc},
          seo_keywords      = ${r.keywords},
          seo_bio_status    = 'generated'
        WHERE slug = ${r.slug}
      `;
      console.log(`  ✅ ${r.slug} guardado (status=generated, pendiente de aprobación humana)`);
    }
    console.log(`\n🔒 NUNCA se aprueba automáticamente. Revisa en /admin/talents/{id}/seo`);
  } else {
    console.log(`\n📋 Vista previa completada.`);
    console.log(`   Para guardar: npx tsx scripts/generate-seo-bios.ts --save`);
    console.log(`   Para un talento: npx tsx scripts/generate-seo-bios.ts --slug=todocs2`);
  }

  console.log(`${'═'.repeat(72)}\n`);
}

main().catch(err => { console.error('\nError fatal:', err); process.exit(1); });
