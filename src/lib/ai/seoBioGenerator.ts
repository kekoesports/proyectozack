'server-only';

import { z } from 'zod';
import { env } from '@/lib/env';
import { logRedacted } from '@/lib/log';

// ── Input type (only fields we can safely pass to the LLM) ───────────────────

export type TalentSeoInput = {
  readonly name: string;
  readonly role: string;
  readonly role2?: string | null;
  readonly game: string;
  readonly platform: string;
  readonly bio?: string | null;
  readonly bioLong?: string | null;
  readonly tags: readonly string[];
  readonly socials: readonly { platform: string; followersDisplay: string }[];
  readonly topGeos?: readonly { country: string; pct: number }[] | null;
  readonly audienceLanguage?: string | null;
  readonly creatorCountry?: string | null;
  readonly highlights?: readonly string[] | null;
};

// ── Output type ───────────────────────────────────────────────────────────────

export type SeoBioResult = {
  readonly bio: string;
  readonly seoTitle: string;
  readonly seoDescription: string;
  readonly seoKeywords: string[];
  readonly warnings: string[];
  readonly usedAi: boolean;
};

// ── Zod schema para parsear la respuesta de Gemini ───────────────────────────

const geminiOutputSchema = z.object({
  bio:            z.string().min(50),
  seoTitle:       z.string().min(10).max(200),
  seoDescription: z.string().min(10).max(300),
  keywords:       z.array(z.string()).min(1).default([]),
}).passthrough();

// ── Validador post-generación: detecta cifras inventadas ─────────────────────

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
      if (/[Kk]/.test(s.followersDisplay)) { known.add(String(Math.round(parsed * 1000))); known.add(String(Math.round(parsed * 1000 / 100) * 100)); }
      if (/[Mm]/.test(s.followersDisplay)) known.add(String(Math.round(parsed * 1_000_000)));
      known.add(String(Math.round(parsed)));
    }
  }
  for (const g of input.topGeos ?? []) known.add(String(g.pct));
  return known;
}

function detectInventedNumbers(bioText: string, input: TalentSeoInput): string[] {
  const known = buildKnownNumbers(input);
  const inBio = extractNumbers(bioText);
  // Numbers > 1000 that don't appear in known data are suspicious
  return inBio
    .filter((n) => n > 1000 && !known.has(String(Math.round(n))))
    .map((n) => String(n));
}

// ── Prompt builder ────────────────────────────────────────────────────────────

function buildPrompt(input: TalentSeoInput): string {
  const safeData = {
    nombre: input.name,
    rol: input.role,
    rol_secundario: input.role2 ?? null,
    juego_categoria: input.game,
    plataforma_principal: input.platform,
    bio_existente: input.bio ?? null,
    redes_sociales: input.socials.map((s) => ({ plataforma: s.platform, seguidores: s.followersDisplay })),
    tags: input.tags,
    geos_audiencia: input.topGeos ?? null,
    idioma_audiencia: input.audienceLanguage ?? null,
    pais_creador: input.creatorCountry ?? null,
    logros_destacados: input.highlights ?? null,
  };

  return `Eres un especialista en SEO para agencias de gaming y esports. Genera contenido SEO para la página de perfil de un creador gestionado por SocialPro.

DATOS REALES DEL CREADOR (usa ÚNICAMENTE estos datos, no inventes nada más):
${JSON.stringify(safeData, null, 2)}

REGLAS ESTRICTAS:
1. Entre 180 y 320 palabras en español para el campo "bio".
2. Tono natural, profesional, orientado a SEO. Sin keyword stuffing.
3. Menciona el nombre del creador de forma natural (no empieces cada frase con él).
4. Menciona la plataforma principal si está disponible.
5. Menciona el juego o categoría si está disponible.
6. Menciona países o mercados si hay datos en geos_audiencia o pais_creador.
7. Incluye que SocialPro es su agencia de representación o gestión.
8. Incluye contexto comercial natural: campañas, colaboraciones, activaciones de marca, códigos de descuento o sorteos.
9. NO inventes: torneos, premios, marcas, fechas, edades, ciudades, contratos ni cifras que no estén en los datos.
10. NO uses superlativas ("el mejor", "el mayor") sin datos que lo confirmen.
11. Si los datos son escasos, escribe contenido honesto basado en lo que hay, sin rellenar con frases genéricas vacías.
12. El campo "seoTitle" debe tener menos de 65 caracteres y describir al creador.
13. El campo "seoDescription" debe tener menos de 155 caracteres, incluir nombre, plataforma y juego si están disponibles.
14. El campo "keywords" debe ser un array de 10-15 términos relevantes: nombre del creador, plataforma, juego, país, variantes de búsqueda naturales.

Devuelve ÚNICAMENTE un objeto JSON válido con esta estructura exacta, sin markdown ni texto adicional:
{
  "bio": "texto de la bio",
  "seoTitle": "título SEO <65 chars",
  "seoDescription": "meta description <155 chars",
  "keywords": ["keyword1", "keyword2"]
}`;
}

// ── Main generator ────────────────────────────────────────────────────────────

export async function generateSeoBio(input: TalentSeoInput): Promise<SeoBioResult> {
  const apiKey = env.GEMINI_API_KEY;

  if (!apiKey) {
    return {
      bio: '', seoTitle: '', seoDescription: '', seoKeywords: [],
      warnings: ['GEMINI_API_KEY no configurada. Configura la variable de entorno para usar el generador IA.'],
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
    logRedacted('info', '[seo-bio] raw (first 200):', rawText.slice(0, 200));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logRedacted('error', '[seo-bio] Gemini error:', msg);
    const isQuota = msg.includes('429') || msg.toLowerCase().includes('quota');
    return {
      bio: '', seoTitle: '', seoDescription: '', seoKeywords: [],
      warnings: [isQuota
        ? 'Límite de peticiones de Gemini alcanzado. Espera un momento e inténtalo de nuevo.'
        : `Error Gemini: ${msg}`],
      usedAi: false,
    };
  }

  // Extract JSON block
  const jsonMatch = rawText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return {
      bio: '', seoTitle: '', seoDescription: '', seoKeywords: [],
      warnings: ['La IA no devolvió JSON válido. Inténtalo de nuevo.'],
      usedAi: true,
    };
  }

  let parsed: unknown;
  try { parsed = JSON.parse(jsonMatch[0]); } catch {
    return {
      bio: '', seoTitle: '', seoDescription: '', seoKeywords: [],
      warnings: ['La IA devolvió JSON malformado. Inténtalo de nuevo.'],
      usedAi: true,
    };
  }

  const parsed2 = geminiOutputSchema.safeParse(parsed);
  if (!parsed2.success) {
    return {
      bio: '', seoTitle: '', seoDescription: '', seoKeywords: [],
      warnings: [`Formato inesperado de la IA: ${parsed2.error.message}`],
      usedAi: true,
    };
  }

  const { bio, seoTitle, seoDescription, keywords } = parsed2.data;

  // Post-generation validation: detect invented numbers
  const suspiciousNumbers = detectInventedNumbers(bio, input);
  const warnings: string[] = [];
  if (suspiciousNumbers.length > 0) {
    warnings.push(
      `⚠ La IA puede haber inventado cifras: ${suspiciousNumbers.join(', ')}. Revisa el texto antes de aprobar.`,
    );
  }

  // Trim to limits
  const trimTitle = seoTitle.slice(0, 200);
  const trimDesc  = seoDescription.slice(0, 300);

  return {
    bio: bio.trim(),
    seoTitle: trimTitle,
    seoDescription: trimDesc,
    seoKeywords: (keywords as string[]).slice(0, 20),
    warnings,
    usedAi: true,
  };
}
