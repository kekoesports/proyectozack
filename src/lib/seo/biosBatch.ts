'server-only';

/**
 * biosBatch.ts — Lógica core de generación de bios SEO en batch.
 *
 * Reutilizable por:
 *   - CLI:         scripts/generate-seo-bios.ts
 *   - Cron futuro: /api/cron/generate-seo-bios (Vercel Cron)
 *   - CRM batch:   /admin/talents/seo/batch (UI futura)
 *
 * Sin dependencias de Next.js env — usa directamente process.env
 * para ser ejecutable tanto desde scripts tsx como desde API routes.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

// ── Types públicos ─────────────────────────────────────────────────────────────

export type BioBatchInput = {
  /** Identificador DB del talento */
  id:           number;
  slug:         string;
  name:         string;
  role:         string;
  role2:        string | null;
  game:         string;
  platform:     string;
  bio:          string | null;
  bioLong:      string | null;
  tags:         string[];
  creatorCountry:   string | null;
  audienceLanguage: string | null;
  topGeos:      Array<{ country: string; pct: number }> | null;
  highlights:   string[] | null;
  seoBioStatus: string;
  seoBioManual: string | null;
  seoKeywords:  string[] | null;     // can contain _fp:hash prefix
  lastStatsUpdateAt: Date | null;
  // Per-platform data
  socials: Array<{
    platform:         string;
    followersDisplay: string;
    platformId:       string | null;  // null = not synced via API
  }>;
  activeBrands:    string[];
  activeGiveaways: number;
  campaignCount:   number;
};

export type BioBatchResult = {
  slug:         string;
  name:         string;
  bio:          string;
  seoTitle:     string;
  seoDesc:      string;
  keywords:     string[];
  qualityScore: number;             // 0-100
  issues:       string[];
  skipped:      boolean;
  skipReason?:  string;
  fingerprint:  string;
};

export type BatchRunOptions = {
  /** Only process profiles without approved status */
  onlyPending:  boolean;
  /** Max profiles to process in one run */
  limit:        number;
  /** Force regeneration even if input unchanged */
  force:        boolean;
  /** Max retries per profile */
  maxRetries:   number;
  /** Similarity threshold to warn (0-1) */
  similarityWarn:  number;
  /** Similarity threshold to block save (0-1) */
  similarityBlock: number;
};

export const DEFAULT_OPTIONS: BatchRunOptions = {
  onlyPending:     true,
  limit:           20,
  force:           false,
  maxRetries:      2,
  similarityWarn:  0.35,
  similarityBlock: 0.50,
};

// ── Fingerprint (deduplication) ───────────────────────────────────────────────

export function computeFingerprint(input: BioBatchInput): string {
  const sig = JSON.stringify({
    n: input.name, r: input.role, g: input.game, p: input.platform,
    t: [...input.tags].sort(),
    s: input.socials.map(s => `${s.platform}:${s.followersDisplay}`).sort(),
    b: [...input.activeBrands].sort(),
    gv: input.activeGiveaways,
    c: input.campaignCount,
    sy: input.lastStatsUpdateAt?.toISOString().slice(0, 10) ?? null,
  });
  let h = 2166136261;
  for (let i = 0; i < sig.length; i++) {
    h ^= sig.charCodeAt(i);
    h = (h * 16777619) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

export function extractStoredFingerprint(keywords: string[] | null): string | null {
  const fp = (keywords ?? []).find(k => k.startsWith('_fp:'));
  return fp ? fp.slice(4) : null;
}

export function cleanKeywords(keywords: string[]): string[] {
  return keywords.filter(k => !k.startsWith('_fp:'));
}

export function injectFingerprint(keywords: string[], fp: string): string[] {
  return [`_fp:${fp}`, ...cleanKeywords(keywords)];
}

// ── Quality score ─────────────────────────────────────────────────────────────

export function computeQualityScore(
  bio: string,
  input: BioBatchInput,
  issues: string[],
): number {
  let score = 50;

  // Riqueza de datos usados
  if (input.activeBrands.length > 0) score += 10;
  if (input.activeGiveaways > 0)     score += 5;
  if (input.campaignCount > 0)       score += 5;
  if (input.tags.length >= 3)        score += 5;
  if ((input.topGeos?.length ?? 0) > 0) score += 5;
  if ((input.highlights?.length ?? 0) > 0) score += 5;
  // Sync quality
  const syncedPlatforms = input.socials.filter(s => s.platformId).length;
  score += Math.min(syncedPlatforms * 5, 10);

  // Longitud correcta
  const wc = bio.trim().split(/\s+/).filter(Boolean).length;
  if (wc >= 200 && wc <= 320) score += 5;
  else if (wc < 150 || wc > 380) score -= 10;

  // Penalización por guardrails
  score -= issues.length * 15;

  return Math.max(0, Math.min(100, score));
}

export function qualityLabel(score: number): string {
  if (score >= 80) return '🟢 Alta';
  if (score >= 60) return '🟡 Media';
  if (score >= 40) return '🟠 Baja';
  return '🔴 Insuficiente';
}

// ── Similarity (Jaccard sobre bigramas) ───────────────────────────────────────

function tokenize(text: string): Set<string> {
  const words = text.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/).filter(w => w.length > 3);
  const tokens = new Set<string>(words);
  for (let i = 0; i < words.length - 1; i++) tokens.add(`${words[i]}_${words[i + 1]}`);
  return tokens;
}

export function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  const inter = new Set([...a].filter(x => b.has(x)));
  const union = new Set([...a, ...b]);
  return union.size === 0 ? 0 : inter.size / union.size;
}

export function checkSimilarity(
  results: Array<{ slug: string; bio: string }>,
  warnThreshold:  number,
  blockThreshold: number,
): Array<{ a: string; b: string; score: number; block: boolean }> {
  const tokenSets = results.map(r => ({ slug: r.slug, tokens: tokenize(r.bio) }));
  const pairs: Array<{ a: string; b: string; score: number; block: boolean }> = [];
  for (let i = 0; i < tokenSets.length; i++) {
    for (let j = i + 1; j < tokenSets.length; j++) {
      const setA = tokenSets[i];
      const setB = tokenSets[j];
      if (!setA || !setB) continue;
      const score = jaccardSimilarity(setA.tokens, setB.tokens);
      if (score >= warnThreshold) {
        pairs.push({ a: setA.slug, b: setB.slug, score, block: score >= blockThreshold });
      }
    }
  }
  return pairs;
}

// ── Guardrails ─────────────────────────────────────────────────────────────────

const FORBIDDEN_PHRASES = [
  'el mejor', 'la mejor', 'el más popular', 'la más popular',
  'líder indiscutible', 'referente absoluto', 'el streamer más',
  'número uno', 'número 1', 'el más seguido', 'la más seguida',
  'top streamer', 'el mayor', 'la mayor',
];
const TOURNAMENT_RE = [
  /ganó (el|la|un|una)/i, /campeón (de|en)/i, /finalista en/i,
  /subcampeón/i, /primer puesto/i, /clasificó (para|en)/i,
  /quedó (primero|segundo|tercero)/i, /ganador de/i,
];
const UNVERIFIED_BRANDS = ['razer', 'logitech', 'corsair', 'steelseries', 'bet365', 'betway', '1xbet', 'betwinner', 'bwin'];

export function detectGuardrails(bio: string, knownBrands: string[]): string[] {
  const lower = bio.toLowerCase();
  const issues: string[] = [];

  const forbidden = FORBIDDEN_PHRASES.filter(p => lower.includes(p));
  if (forbidden.length) issues.push(`⚠ Frases absolutas: "${forbidden.join('", "')}"`);

  if (TOURNAMENT_RE.some(p => p.test(bio))) issues.push('🚨 Posible mención de torneos/logros no verificados');

  const knownLower = knownBrands.map(b => b.toLowerCase());
  const invented = UNVERIFIED_BRANDS.filter(b => lower.includes(b) && !knownLower.some(k => k.includes(b)));
  if (invented.length) issues.push(`⚠ Marcas no verificadas: ${invented.join(', ')}`);

  const wc = bio.trim().split(/\s+/).filter(Boolean).length;
  if (wc < 150) issues.push(`⚠ Bio corta: ${wc} palabras (mínimo 200)`);
  if (wc > 380) issues.push(`⚠ Bio larga: ${wc} palabras (máximo 320)`);

  return issues;
}

// ── Prompt ─────────────────────────────────────────────────────────────────────

export function buildBioPrompt(input: BioBatchInput): string {
  const socialSummary = input.socials
    .filter(s => s.followersDisplay && !['-', '—', ''].includes(s.followersDisplay))
    .map(s => {
      const sync = s.platformId ? '✓ API' : '⚠ sin sync';
      return `${s.platform}: ${s.followersDisplay} (${sync})`;
    }).join(' | ') || 'Sin métricas disponibles';

  const twitchRow = input.socials.find(s => s.platform === 'twitch');
  const twitchUnsync = !!twitchRow && !twitchRow.platformId;
  const geos = input.topGeos?.length ? input.topGeos.map(g => `${g.country} ${g.pct}%`).join(', ') : null;

  const safeData = {
    nombre:           input.name,
    rol_principal:    input.role,
    rol_secundario:   input.role2 ?? null,
    juego_categoria:  input.game,
    plataforma_principal: input.platform,
    bio_corta:        input.bio,
    redes_sociales:   socialSummary,
    tags:             input.tags,
    pais_creador:     input.creatorCountry,
    mercados_audiencia: geos,
    idioma_audiencia: input.audienceLanguage,
    logros_destacados: input.highlights,
    marcas_activas_verificadas: input.activeBrands.length > 0 ? input.activeBrands : null,
    sorteos_activos:  input.activeGiveaways > 0 ? input.activeGiveaways : null,
    campanas_crm:     input.campaignCount > 0 ? input.campaignCount : null,
    bio_manual_referencia: input.seoBioManual?.slice(0, 250) ?? null,
  };

  const twitchNote = twitchUnsync
    ? '\n⚠️  NOTA: Followers de Twitch NO verificados vía API. No los menciones o hazlo con precaución.'
    : '';

  return `Eres especialista SEO de gaming y esports. Genera contenido SEO DIFERENCIADO para "${input.name}", creador representado por SocialPro.

DATOS VERIFICADOS:
${JSON.stringify(safeData, null, 2)}
${twitchNote}

REGLAS:
1. Bio 200-320 palabras, español, natural y profesional.
2. DIFERENCIACIÓN OBLIGATORIA: texto único para este creador, con sus datos específicos. No uses frases genéricas.
3. SOLO menciona marcas de "marcas_activas_verificadas". Si es null, NO inventes marcas.
4. Si mercados_audiencia es null, NO menciones distribución geográfica específica.
5. SocialPro: máximo una mención natural como agencia.
6. PROHIBIDO: "el mejor", "referente", "número uno", torneos/logros no confirmados.
7. Si datos escasos, sé honesto y conciso.
8. Si bio_manual_referencia existe, úsala solo como guía de tono, NO la copies.
9. seoTitle < 65 chars: nombre + rol + plataforma/juego.
10. seoDescription < 155 chars: accionable con nombre + plataforma + juego.
11. keywords: 12-15 términos en español con long-tail.

Responde ÚNICAMENTE JSON sin markdown:
{"bio":"...","seoTitle":"...","seoDescription":"...","keywords":["..."]}`;
}

// ── Generador principal ────────────────────────────────────────────────────────

export async function generateOneBio(
  input:      BioBatchInput,
  model:      ReturnType<InstanceType<typeof GoogleGenerativeAI>['getGenerativeModel']>,
  options:    Pick<BatchRunOptions, 'force' | 'maxRetries'>,
  onLog?:     (msg: string) => void,
): Promise<BioBatchResult> {
  const log = onLog ?? console.log;

  // Deduplication check
  const fingerprint = computeFingerprint(input);
  const storedFp    = extractStoredFingerprint(input.seoKeywords);
  if (!options.force && storedFp === fingerprint && input.seoBioStatus !== 'empty') {
    return {
      slug: input.slug, name: input.name,
      bio: '', seoTitle: '', seoDesc: '', keywords: [],
      qualityScore: 0, issues: [],
      skipped: true, skipReason: `Sin cambios desde última generación (fp:${fingerprint.slice(0, 6)})`,
      fingerprint,
    };
  }

  // Retry loop
  let lastError = '';
  for (let attempt = 1; attempt <= options.maxRetries; attempt++) {
    if (attempt > 1) {
      log(`  ↺ Reintento ${attempt}/${options.maxRetries}...`);
      await new Promise(r => setTimeout(r, 2000 * attempt));
    }

    let rawText = '';
    try {
      const res = await model.generateContent(buildBioPrompt(input));
      rawText = res.response.text();
    } catch (err) {
      lastError = (err as Error).message;
      const isQuota = lastError.includes('429') || lastError.toLowerCase().includes('quota');
      if (isQuota) {
        log(`  ⏳ Límite de quota. Esperando 30s...`);
        await new Promise(r => setTimeout(r, 30000));
      }
      continue;
    }

    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) { lastError = 'Sin JSON en respuesta'; continue; }

    let parsed: { bio?: string; seoTitle?: string; seoDescription?: string; keywords?: string[] } = {};
    try { parsed = JSON.parse(jsonMatch[0]) as typeof parsed; }
    catch { lastError = 'JSON malformado'; continue; }

    const bio      = (parsed.bio ?? '').trim();
    const seoTitle = (parsed.seoTitle ?? '').trim();
    const seoDesc  = (parsed.seoDescription ?? '').trim();
    const rawKws   = parsed.keywords ?? [];
    const issues   = detectGuardrails(bio, input.activeBrands);
    const qualityScore = computeQualityScore(bio, input, issues);

    return {
      slug: input.slug, name: input.name,
      bio, seoTitle, seoDesc,
      keywords: injectFingerprint(rawKws, fingerprint),
      qualityScore, issues,
      skipped: false, fingerprint,
    };
  }

  // All retries failed
  return {
    slug: input.slug, name: input.name,
    bio: '', seoTitle: '', seoDesc: '', keywords: [],
    qualityScore: 0, issues: [`❌ Fallido tras ${options.maxRetries} intentos: ${lastError}`],
    skipped: true, skipReason: lastError, fingerprint,
  };
}
