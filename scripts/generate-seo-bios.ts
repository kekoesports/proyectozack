/**
 * generate-seo-bios.ts — Genera bios SEO V2 para los talentos seleccionados.
 *
 * Modos:
 *   npx tsx scripts/generate-seo-bios.ts              ← genera + muestra, NO guarda
 *   npx tsx scripts/generate-seo-bios.ts --save        ← guarda como borrador (status=generated)
 *   npx tsx scripts/generate-seo-bios.ts --slug=todocs2 ← solo un talento
 *
 * Requiere: GEMINI_API_KEY, DATABASE_URL en .env.local
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
} catch {}

const GEMINI_API_KEY = process.env.GEMINI_API_KEY ?? '';
const DATABASE_URL   = process.env.DATABASE_URL ?? '';
const SAVE_TO_DB     = process.argv.includes('--save');
const SLUG_FILTER    = process.argv.find(a => a.startsWith('--slug='))?.split('=')[1];

if (!DATABASE_URL) { console.error('❌ DATABASE_URL no configurado'); process.exit(1); }
if (!GEMINI_API_KEY) { console.error('❌ GEMINI_API_KEY no configurado'); process.exit(1); }

// ── Slugs a generar ───────────────────────────────────────────────────────────
const TARGET_SLUGS = SLUG_FILTER ? [SLUG_FILTER] : [
  'todocs2',      // Big · CS2 · brands + giveaways
  'deqiuv',       // Big · CS2+Valorant · Twitch gigante
  'hetta',        // Medium · CS2 · YouTube fuerte
  'gordoreally',  // Medium · CS2 · Twitch dominante + brand
  'eruby',        // Medium · CS2 · datos escasos (stress test)
  'jolu',         // Small · CS2 · YouTube + brands
  'naow',         // NON-CS2 · Gaming/Variety · brands + giveaway
];

// ── Guardrails ────────────────────────────────────────────────────────────────

const FORBIDDEN_PHRASES = [
  'el mejor', 'la mejor', 'el más popular', 'la más popular',
  'líder indiscutible', 'referente absoluto', 'el streamer más',
  'número uno', 'número 1', 'el más seguido', 'la más seguida',
];
const TOURNAMENT_PATTERNS = [
  /ganó (el|la|un|una)/i, /campeón (de|en)/i, /finalista en/i,
  /subcampeón/i, /primer puesto/i, /clasificó (en|para)/i,
];
const COMMON_BRANDS_NOT_CONFIRMED = ['razer', 'logitech', 'corsair', 'steelseries', 'bet365', 'betway', '1xbet', 'betwinner'];

function detectIssues(text: string, knownBrands: string[]): string[] {
  const lower = text.toLowerCase();
  const issues: string[] = [];

  const forbidden = FORBIDDEN_PHRASES.filter(p => lower.includes(p));
  if (forbidden.length) issues.push(`⚠ Frases absolutas: "${forbidden.join('", "')}"`);

  if (TOURNAMENT_PATTERNS.some(p => p.test(text))) issues.push('🚨 Posible mención de torneos/logros no verificados');

  const knownLower = knownBrands.map(b => b.toLowerCase());
  const inventedBrands = COMMON_BRANDS_NOT_CONFIRMED.filter(b => lower.includes(b) && !knownLower.some(k => k.includes(b)));
  if (inventedBrands.length) issues.push(`⚠ Marcas no verificadas: ${inventedBrands.join(', ')}`);

  return issues;
}

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

// ── Prompt ────────────────────────────────────────────────────────────────────

function buildPrompt(data: {
  nombre: string; rol: string; rol2: string | null; juego: string; plataforma: string;
  bio: string | null; tags: string[]; socials: string; geos: string | null;
  pais: string | null; idioma: string | null; highlights: string[] | null;
  marcas: string[] | null; sorteos: number; campanas: number;
  bio_manual: string | null; twitch_sin_sync: boolean;
}): string {
  const twitchNote = data.twitch_sin_sync
    ? '\n⚠️  NOTA: Followers de Twitch NO verificados con API — úsalos con precaución o no los menciones.'
    : '';

  return `Eres especialista SEO de gaming y esports. Genera contenido SEO diferenciado para "${data.nombre}", creador representado por SocialPro.

DATOS VERIFICADOS:
${JSON.stringify({
  nombre: data.nombre,
  rol_principal: data.rol,
  rol_secundario: data.rol2,
  juego_categoria: data.juego,
  plataforma_principal: data.plataforma,
  bio_corta: data.bio,
  redes_sociales: data.socials,
  tags: data.tags,
  pais_creador: data.pais,
  mercados_audiencia: data.geos,
  idioma_audiencia: data.idioma,
  logros_destacados: data.highlights,
  marcas_activas_verificadas: data.marcas,
  sorteos_activos: data.sorteos > 0 ? data.sorteos : null,
  campanas_crm: data.campanas > 0 ? data.campanas : null,
  bio_manual_referencia: data.bio_manual ? data.bio_manual.slice(0, 250) : null,
}, null, 2)}${twitchNote}

REGLAS:
1. Bio 200-320 palabras, español, tono natural y profesional.
2. Diferencia este creador: usa sus datos únicos. No suene a plantilla.
3. Menciona solo marcas de "marcas_activas_verificadas". Si es null, NO inventes marcas.
4. Si mercados_audiencia es null, NO menciones distribución geográfica específica.
5. SocialPro = agencia (mencionar máximo una vez, de forma natural).
6. PROHIBIDO: "el mejor", "referente", "número uno", torneos/logros no verificados.
7. Si los datos son escasos, sé honesto. No rellenes con frases genéricas.
8. Si bio_manual_referencia existe, úsala solo como guía de tono.
9. seoTitle: <65 chars — nombre + rol + plataforma.
10. seoDescription: <155 chars — accionable, nombre + plataforma + juego.
11. keywords: 12-15 términos en español, variantes naturales de búsqueda.

Responde SOLO JSON sin markdown:
{"bio":"...","seoTitle":"...","seoDescription":"...","keywords":["..."]}`;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const sql = neon(DATABASE_URL);
  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  console.log(`\n${'═'.repeat(70)}`);
  console.log(`SEO Bios V2 — ${TARGET_SLUGS.length} perfiles${SAVE_TO_DB ? ' [GUARDAR EN DB]' : ' [SOLO VISTA]'}`);
  console.log(`${'═'.repeat(70)}\n`);

  for (const slug of TARGET_SLUGS) {
    console.log(`\n${'─'.repeat(70)}`);
    console.log(`📍 ${slug.toUpperCase()}`);
    console.log(`${'─'.repeat(70)}`);

    // Fetch talent + social + codes + giveaways + campaigns
    const [talentRows, socialsRows, codesRows, giveawayRows, campaignRows] = await Promise.all([
      sql`SELECT t.*, array_agg(DISTINCT tt.tag) FILTER (WHERE tt.id IS NOT NULL) AS tags
          FROM talents t LEFT JOIN talent_tags tt ON tt.talent_id = t.id
          WHERE t.slug = ${slug} GROUP BY t.id`,
      sql`SELECT platform, followers_display, platform_id FROM talent_socials WHERE talent_id = (SELECT id FROM talents WHERE slug = ${slug})`,
      sql`SELECT DISTINCT brand_name FROM creator_codes WHERE talent_id = (SELECT id FROM talents WHERE slug = ${slug})`,
      sql`SELECT id FROM giveaways WHERE talent_id = (SELECT id FROM talents WHERE slug = ${slug}) AND (ends_at IS NULL OR ends_at > NOW())`,
      sql`SELECT id FROM campaigns WHERE talent_id = (SELECT id FROM talents WHERE slug = ${slug})`,
    ]);

    const t = talentRows[0];
    if (!t) { console.log(`❌ No encontrado: ${slug}`); continue; }

    // Build social summary
    const socialSummary = socialsRows
      .filter(s => s.followers_display && !['-','—'].includes(s.followers_display))
      .map(s => {
        const sync = s.platform_id ? `✓` : `⚠ sin sync`;
        return `${s.platform}: ${s.followers_display} (${sync})`;
      }).join(' | ') || 'sin métricas disponibles';

    const twitchRow = socialsRows.find(s => s.platform === 'twitch');
    const twitchSinSync = !!twitchRow && !twitchRow.platform_id;

    const activeBrands = codesRows.map(c => c.brand_name as string).filter(Boolean);
    const geos = t.top_geos as Array<{country: string; pct: number}> | null;

    // Show context
    console.log(`Game: ${t.game} | Platform: ${t.platform} | Country: ${t.creator_country ?? '?'}`);
    console.log(`Socials: ${socialSummary}`);
    console.log(`Brands: ${activeBrands.join(', ') || '—'} | Giveaways: ${giveawayRows.length} | Campaigns: ${campaignRows.length}`);
    console.log(`Tags: ${(t.tags as string[] ?? []).join(', ') || '—'}`);
    if (twitchSinSync) console.log(`⚠  Twitch sin sincronizar con API`);
    console.log();

    // Generate
    process.stdout.write(`Generando con Gemini... `);
    const start = Date.now();

    let rawText = '';
    try {
      const result = await model.generateContent(buildPrompt({
        nombre:         t.name,
        rol:            t.role,
        rol2:           t.role2 as string | null,
        juego:          t.game,
        plataforma:     t.platform,
        bio:            t.bio as string | null,
        tags:           t.tags as string[] ?? [],
        socials:        socialSummary,
        geos:           geos && geos.length > 0 ? geos.map(g => `${g.country} ${g.pct}%`).join(', ') : null,
        pais:           t.creator_country as string | null,
        idioma:         t.audience_language as string | null,
        highlights:     t.highlights as string[] | null,
        marcas:         activeBrands.length > 0 ? activeBrands : null,
        sorteos:        giveawayRows.length,
        campanas:       campaignRows.length,
        bio_manual:     t.seo_bio_manual as string | null,
        twitch_sin_sync: twitchSinSync,
      }));
      rawText = result.response.text();
      console.log(`✅ ${Date.now() - start}ms`);
    } catch (err) {
      console.log(`❌ Error: ${(err as Error).message}`);
      continue;
    }

    // Parse
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) { console.log('❌ No JSON en respuesta'); continue; }
    let parsed: { bio?: string; seoTitle?: string; seoDescription?: string; keywords?: string[] };
    try { parsed = JSON.parse(jsonMatch[0]); } catch { console.log('❌ JSON malformado'); continue; }

    const bio   = (parsed.bio ?? '').trim();
    const title = (parsed.seoTitle ?? '').trim();
    const desc  = (parsed.seoDescription ?? '').trim();
    const kws   = parsed.keywords ?? [];
    const wc    = wordCount(bio);
    const issues = detectIssues(bio, activeBrands);

    // Display
    console.log(`\n── SEO TITLE (${title.length} chars) ──`);
    console.log(title || '(vacío)');

    console.log(`\n── META DESCRIPTION (${desc.length} chars) ──`);
    console.log(desc || '(vacío)');

    console.log(`\n── BIO GENERADA (${wc} palabras) ──`);
    console.log(bio || '(vacío)');

    console.log(`\n── KEYWORDS (${kws.length}) ──`);
    console.log(kws.join(', ') || '(vacío)');

    if (issues.length > 0) {
      console.log(`\n── ⚠  WARNINGS ──`);
      issues.forEach(i => console.log(`  ${i}`));
    } else {
      console.log(`\n── ✅ Sin warnings`);
    }

    // Validations
    if (wc < 150) console.log(`  ⚠ Bio corta: ${wc} palabras (mínimo 200)`);
    if (wc > 380) console.log(`  ⚠ Bio larga: ${wc} palabras (máximo 320)`);
    if (title.length > 65) console.log(`  ⚠ Title largo: ${title.length} chars (máx 65)`);
    if (desc.length > 155) console.log(`  ⚠ Description larga: ${desc.length} chars (máx 155)`);

    // Save
    if (SAVE_TO_DB && bio && title) {
      await sql`
        UPDATE talents SET
          seo_bio_generated = ${bio},
          seo_title = ${title},
          seo_description = ${desc},
          seo_keywords = ${kws},
          seo_bio_status = 'generated'
        WHERE slug = ${slug}
      `;
      console.log(`\n💾 Guardado en DB (status=generated)`);
    }

    // Small delay between requests
    await new Promise(r => setTimeout(r, 1000));
  }

  console.log(`\n${'═'.repeat(70)}`);
  console.log(SAVE_TO_DB
    ? `✅ Bios guardadas en DB. Revísalas en /admin/talents/{id}/seo antes de aprobar.`
    : `📋 Vista previa completa. Ejecuta con --save para guardar en DB.`);
  console.log(`${'═'.repeat(70)}\n`);
}

main().catch(err => { console.error('\nError fatal:', err); process.exit(1); });
