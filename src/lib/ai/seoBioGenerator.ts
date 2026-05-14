'server-only';

import { z } from 'zod';
import { env } from '@/lib/env';
import { logRedacted } from '@/lib/log';

// ── Input ─────────────────────────────────────────────────────────────────────

export type SocialEntry = {
  readonly platform:         string;
  readonly followersDisplay: string;
  readonly synced?:          boolean;   // false = no API sync yet
  readonly lastSyncAt?:      string | null;
};

export type TalentSeoInput = {
  readonly name:              string;
  readonly role:              string;
  readonly role2?:            string | null;
  readonly game:              string;
  readonly platform:          string;
  readonly bio?:              string | null;
  readonly bioLong?:          string | null;
  readonly tags:              readonly string[];
  readonly socials:           readonly SocialEntry[];
  readonly topGeos?:          readonly { country: string; pct: number }[] | null;
  readonly audienceLanguage?: string | null;
  readonly creatorCountry?:   string | null;
  readonly highlights?:       readonly string[] | null;
  // V2 — datos comerciales verificados
  readonly activeBrands?:     readonly string[];       // brand names from active creator_codes
  readonly activeGiveaways?:  number;                  // count of active giveaways
  readonly campaignCount?:    number;                  // count of CRM campaigns
  readonly seoBioManual?:     string | null;           // existing manual bio (reference only)
};

// ── Output ────────────────────────────────────────────────────────────────────

export type SeoBioResult = {
  readonly bio:           string;
  readonly seoTitle:      string;
  readonly seoDescription: string;
  readonly seoKeywords:   string[];
  readonly warnings:      string[];
  readonly usedAi:        boolean;
};

// ── Zod schema ────────────────────────────────────────────────────────────────

const geminiOutputSchema = z.object({
  bio:            z.string().min(50),
  seoTitle:       z.string().min(10).max(200),
  seoDescription: z.string().min(10).max(300),
  keywords:       z.array(z.string()).min(1).default([]),
}).passthrough();

// ── Post-generation validators ────────────────────────────────────────────────

function extractNumbers(text: string): number[] {
  return [...text.matchAll(/\d[\d.,]*/g)]
    .map((m) => parseFloat(m[0].replace(',', '.')))
    .filter((n) => !isNaN(n));
}

function buildKnownNumbers(input: TalentSeoInput): Set<string> {
  const known = new Set<string>();
  for (const s of input.socials) {
    const clean = s.followersDisplay.replace(/[^0-9.,KkMm]/g, '');
    known.add(clean);
    const parsed = parseFloat(clean.replace(',', '.'));
    if (!isNaN(parsed)) {
      if (/[Kk]/i.test(s.followersDisplay)) { known.add(String(Math.round(parsed * 1000))); known.add(String(Math.round(parsed * 1000 / 100) * 100)); }
      if (/[Mm]/i.test(s.followersDisplay)) known.add(String(Math.round(parsed * 1_000_000)));
      known.add(String(Math.round(parsed)));
    }
  }
  for (const g of input.topGeos ?? []) known.add(String(g.pct));
  return known;
}

function detectInventedNumbers(text: string, input: TalentSeoInput): string[] {
  const known = buildKnownNumbers(input);
  return extractNumbers(text)
    .filter((n) => n > 1000 && !known.has(String(Math.round(n))))
    .map((n) => String(n));
}

const FORBIDDEN_PHRASES = [
  'el mejor', 'la mejor', 'el más popular', 'la más popular',
  'líder indiscutible', 'referente absoluto', 'el streamer más',
  'la streamer más', 'número uno', 'número 1',
  'el más seguido', 'la más seguida',
];

function detectForbiddenClaims(text: string): string[] {
  const lower = text.toLowerCase();
  return FORBIDDEN_PHRASES.filter(p => lower.includes(p));
}

const TOURNAMENT_PATTERNS = [
  /ganó (el|la|un|una)/i, /campeón (de|en)/i, /campeona (de|en)/i,
  /finalista en/i, /subcampeón/i, /primer puesto/i, /primera posición/i,
  /clasificó (en|para)/i, /quedó (primero|segunda|tercero)/i,
];

function detectTournamentClaims(text: string): boolean {
  return TOURNAMENT_PATTERNS.some(p => p.test(text));
}

function detectInventedBrands(text: string, knownBrands: readonly string[]): string[] {
  // Common gaming/iGaming brand names NOT in the input — flag if they appear
  const COMMON_BRANDS = ['razer', 'logitech', 'corsair', 'steelseries', 'bet365', 'betway', 'codashop', '1xbet', 'betwinner'];
  const lowerText = text.toLowerCase();
  const knownLower = knownBrands.map(b => b.toLowerCase());
  return COMMON_BRANDS.filter(b => lowerText.includes(b) && !knownLower.some(k => k.includes(b)));
}

// ── Prompt V2 ─────────────────────────────────────────────────────────────────

function buildFollowersSummary(socials: readonly SocialEntry[]): string {
  return socials
    .filter(s => s.followersDisplay && s.followersDisplay !== '-' && s.followersDisplay !== '—')
    .map(s => {
      const syncNote = s.synced === false ? ' (sin sincronizar)' : s.synced === true && s.lastSyncAt ? ` (actualizado ${s.lastSyncAt})` : '';
      return `${s.platform}: ${s.followersDisplay}${syncNote}`;
    })
    .join(', ') || 'sin datos de seguidores';
}

function buildPrompt(input: TalentSeoInput): string {
  const hasGeos = (input.topGeos?.length ?? 0) > 0;
  const hasActiveBrands = (input.activeBrands?.length ?? 0) > 0;
  const hasGiveaways = (input.activeGiveaways ?? 0) > 0;
  const hasCampaigns = (input.campaignCount ?? 0) > 0;

  const safeData = {
    nombre: input.name,
    rol_principal: input.role,
    rol_secundario: input.role2 ?? null,
    juego_categoria: input.game,
    plataforma_principal: input.platform,
    bio_corta_existente: input.bio ?? null,
    redes_sociales: buildFollowersSummary(input.socials),
    tags: input.tags,
    pais_creador: input.creatorCountry ?? null,
    mercados_audiencia: hasGeos ? input.topGeos : null,
    idioma_audiencia: input.audienceLanguage ?? null,
    logros_destacados: input.highlights ?? null,
    // Datos comerciales verificados
    marcas_activas_verificadas: hasActiveBrands ? input.activeBrands : null,
    sorteos_activos: hasGiveaways ? input.activeGiveaways : null,
    campanas_crm: hasCampaigns ? input.campaignCount : null,
    // Referencia bio manual si existe (NO sobrescribir, solo inspirarse en el estilo)
    bio_manual_referencia: input.seoBioManual?.slice(0, 200) ?? null,
  };

  const unsyncedPlatforms = input.socials
    .filter(s => s.synced === false)
    .map(s => s.platform);

  const unsyncedNote = unsyncedPlatforms.length > 0
    ? `NOTA: Los seguidores de ${unsyncedPlatforms.join(', ')} NO están sincronizados con APIs reales — úsalos solo si el número parece razonable o ignóralos.`
    : '';

  return `Eres un especialista en SEO para agencias de gaming y esports. Genera contenido SEO diferenciado para la página de perfil de "${input.name}", creador representado por SocialPro.

DATOS VERIFICADOS DEL CREADOR:
${JSON.stringify(safeData, null, 2)}

${unsyncedNote ? `⚠️  ${unsyncedNote}\n` : ''}
REGLAS NO NEGOCIABLES:
1. Bio entre 200 y 320 palabras en español.
2. Tono natural y profesional — no suena a plantilla genérica.
3. Diferencia este creador de otros: usa sus datos únicos (plataforma, juego, comunidad, marcas si existen).
4. Solo menciona marcas que aparezcan en "marcas_activas_verificadas". Si es null, NO inventes marcas.
5. Solo menciona sorteos/campañas si hay datos confirmados. Si los campos son null, NO inventes actividad comercial.
6. Incluye que SocialPro gestiona al creador (máximo una mención natural).
7. Si "mercados_audiencia" es null, NO menciones distribución geográfica específica.
8. PROHIBIDO inventar: torneos, premios, clasificaciones, resultados, logros no presentes en los datos.
9. PROHIBIDO usar: "el mejor", "el mayor", "referente", "líder", "número uno", "el más seguido".
10. Si los datos son escasos, escribe contenido honesto y útil sin inventar nada.
11. Si existe "bio_manual_referencia", úsala solo como guía de estilo y tono, no la copies.
12. seoTitle: menos de 65 caracteres, describe al creador con nombre + rol + plataforma.
13. seoDescription: menos de 155 caracteres, accionable e incluye nombre + plataforma + juego.
14. keywords: 10-15 términos en español + variantes naturales de búsqueda.

Devuelve ÚNICAMENTE JSON sin markdown:
{
  "bio": "texto 200-320 palabras",
  "seoTitle": "<65 chars",
  "seoDescription": "<155 chars",
  "keywords": ["..."]
}`;
}

// ── Main generator ────────────────────────────────────────────────────────────

export async function generateSeoBio(input: TalentSeoInput): Promise<SeoBioResult> {
  const apiKey = env.GEMINI_API_KEY;

  if (!apiKey) {
    return {
      bio: '', seoTitle: '', seoDescription: '', seoKeywords: [],
      warnings: ['GEMINI_API_KEY no configurada.'],
      usedAi: false,
    };
  }

  const { GoogleGenerativeAI } = await import('@google/generative-ai');
  const modelName = env.GEMINI_MODEL ?? 'gemini-2.0-flash';
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: modelName });

  let rawText: string;
  try {
    const result = await model.generateContent(buildPrompt(input));
    rawText = result.response.text();
    logRedacted('info', '[seo-bio-v2] raw (first 200):', rawText.slice(0, 200));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logRedacted('error', '[seo-bio-v2] Gemini error:', msg);
    const isQuota = msg.includes('429') || msg.toLowerCase().includes('quota');
    return {
      bio: '', seoTitle: '', seoDescription: '', seoKeywords: [],
      warnings: [isQuota
        ? 'Límite de peticiones de Gemini alcanzado. Espera un momento.'
        : `Error Gemini: ${msg}`],
      usedAi: false,
    };
  }

  const jsonMatch = rawText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return { bio: '', seoTitle: '', seoDescription: '', seoKeywords: [], warnings: ['La IA no devolvió JSON válido.'], usedAi: true };
  }

  let parsed: unknown;
  try { parsed = JSON.parse(jsonMatch[0]); }
  catch { return { bio: '', seoTitle: '', seoDescription: '', seoKeywords: [], warnings: ['JSON malformado de la IA.'], usedAi: true }; }

  const parsed2 = geminiOutputSchema.safeParse(parsed);
  if (!parsed2.success) {
    return { bio: '', seoTitle: '', seoDescription: '', seoKeywords: [], warnings: [`Formato inesperado: ${parsed2.error.message}`], usedAi: true };
  }

  const { bio, seoTitle, seoDescription, keywords } = parsed2.data;
  const warnings: string[] = [];

  // Guardrail 1: números inventados
  const inventedNums = detectInventedNumbers(bio, input);
  if (inventedNums.length > 0) {
    warnings.push(`⚠️ Posibles cifras inventadas: ${inventedNums.join(', ')}. Revisa antes de aprobar.`);
  }

  // Guardrail 2: frases absolutas prohibidas
  const forbiddenFound = detectForbiddenClaims(bio);
  if (forbiddenFound.length > 0) {
    warnings.push(`⚠️ Afirmaciones absolutas detectadas: "${forbiddenFound.join('", "')}". Edita antes de aprobar.`);
  }

  // Guardrail 3: menciones de torneos/logros
  if (detectTournamentClaims(bio)) {
    warnings.push('🚨 Posible mención de torneos o logros competitivos no verificados. Revisa antes de aprobar.');
  }

  // Guardrail 4: marcas no verificadas
  const inventedBrands = detectInventedBrands(bio, input.activeBrands ?? []);
  if (inventedBrands.length > 0) {
    warnings.push(`⚠️ Marcas no verificadas detectadas: ${inventedBrands.join(', ')}. Confirma o elimina.`);
  }

  // Guardrail 5: Twitch sin sincronizar
  const unsyncedTwitch = input.socials.find(s => s.platform === 'twitch' && s.synced === false);
  if (unsyncedTwitch) {
    warnings.push(`ℹ️ Followers de Twitch (${unsyncedTwitch.followersDisplay}) no sincronizados con la API. Verifica manualmente.`);
  }

  return {
    bio: bio.trim(),
    seoTitle: seoTitle.slice(0, 200),
    seoDescription: seoDescription.slice(0, 300),
    seoKeywords: (keywords as string[]).slice(0, 20),
    warnings,
    usedAi: true,
  };
}
