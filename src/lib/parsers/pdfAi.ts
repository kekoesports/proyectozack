// Gemini-powered PDF invoice extractor (free tier: 1500 req/day).
// Falls back gracefully when GEMINI_API_KEY is not set.
// Dynamic import keeps @google/generative-ai out of the module init phase.

import { z } from 'zod';
import { logRedacted } from '@/lib/log';
import type { InvoiceDraft } from '@/lib/schemas/invoiceDraft';

// SocialPro issuer identifiers — if any match → kind = "income".
const SOCIALPRO_SIGNALS = [
  'PLAYMAKER MEDIA LLC',
  'THE AGENT',
  'ElevateX Agency',
  'ElevateX Agencia',
  'B21821046',
  '98-1925044',
];

const SYSTEM_PROMPT = `Eres un extractor de datos de facturas para SocialPro, agencia de talentos.

Las entidades de SocialPro son (cuando SocialPro es el EMISOR → kind "income"; cuando es el RECEPTOR que paga → kind "expense"):
- ElevateX Agency PA SL · NIF B21821046 (España)
- PLAYMAKER MEDIA LLC / THE AGENT · EIN 98-1925044 (USA)

Extrae los datos de esta factura y devuelve SOLO el JSON con estos campos:

{
  "kind": "income" o "expense",
  "number": "número de factura",
  "issueDate": "YYYY-MM-DD",
  "concept": "descripción del servicio o producto",
  "counterpartyName": "nombre del cliente o proveedor (la otra parte, no SocialPro)",
  "issuerNif": "NIF, CIF o EIN del emisor",
  "issuerName": "razón social del emisor",
  "netAmount": "importe sin IVA como número decimal (ej: 9245.00)",
  "vatPct": "porcentaje IVA como número (ej: 0 o 21)",
  "withholdingPct": "porcentaje retención como número (ej: 0 o 15)",
  "totalAmount": "importe total como número decimal",
  "currency": "EUR",
  "iban": "IBAN si aparece en la factura",
  "swift": "SWIFT/BIC si aparece en la factura"
}

Responde ÚNICAMENTE con el objeto JSON, sin texto adicional ni markdown.`;

// ── Lenient raw schema: accept whatever Gemini returns ────────────────────────
// Validation/normalization happens in normalizeInvoiceData(), not here.
const geminiRawSchema = z.object({
  kind:             z.unknown().optional(),
  number:           z.unknown().optional(),
  issueDate:        z.unknown().optional(),
  concept:          z.unknown().optional(),
  counterpartyName: z.unknown().optional(),
  issuerNif:        z.unknown().optional(),
  issuerName:       z.unknown().optional(),
  netAmount:        z.unknown().optional(),
  vatPct:           z.unknown().optional(),
  withholdingPct:   z.unknown().optional(),
  totalAmount:      z.unknown().optional(),
  currency:         z.unknown().optional(),
  iban:             z.unknown().optional(),
  swift:            z.unknown().optional(),
}).passthrough();

type GeminiRaw = z.infer<typeof geminiRawSchema>;

// ── Normalizers ───────────────────────────────────────────────────────────────

/** Converts any money representation to "1234.56" (dot-decimal, no symbols). */
function normalizeMoneyString(raw: unknown): string | undefined {
  if (raw === null || raw === undefined) return undefined;
  const str = typeof raw === 'number' ? raw.toString() : String(raw);
  const cleaned = str.replace(/[^\d.,]/g, '').trim();
  if (!cleaned) return undefined;

  const hasDot   = cleaned.includes('.');
  const hasComma = cleaned.includes(',');
  let v: string;

  if (hasDot && hasComma) {
    v = cleaned.lastIndexOf(',') > cleaned.lastIndexOf('.')
      ? cleaned.replace(/\./g, '').replace(',', '.')  // "9.245,00" → "9245.00"
      : cleaned.replace(/,/g, '');                    // "9,245.00" → "9245.00"
  } else if (hasComma) {
    const afterComma = cleaned.slice(cleaned.lastIndexOf(',') + 1);
    v = afterComma.length <= 2
      ? cleaned.replace(',', '.')    // "9245,00" → "9245.00"
      : cleaned.replace(/,/g, '');  // "9,245"   → "9245"
  } else if (hasDot) {
    const afterDot = cleaned.slice(cleaned.lastIndexOf('.') + 1);
    v = afterDot.length <= 2
      ? cleaned                      // "9245.00" → keep
      : cleaned.replace(/\./g, ''); // "9.245"   → "9245"
  } else {
    v = cleaned; // "9245"
  }

  return /^\d+(\.\d{1,2})?$/.test(v) ? v : undefined;
}

/** Strips "%" and normalises as money string. "0%" → "0", "21%" → "21". */
function normalizePct(raw: unknown): string | undefined {
  if (raw === null || raw === undefined) return undefined;
  const str = String(raw).replace('%', '').trim();
  return normalizeMoneyString(str);
}

const DATE_YEAR_MIN = 2015;
const DATE_YEAR_MAX = 2035;

function isCalendarDate(y: number, m: number, d: number): boolean {
  if (y < DATE_YEAR_MIN || y > DATE_YEAR_MAX) return false;
  if (m < 1 || m > 12) return false;
  if (d < 1 || d > 31) return false;
  const dt = new Date(y, m - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
}

function toISO(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/**
 * Robust date parser that avoids day/month inversion.
 *
 * Strategy: European convention = DD/MM/YY(YY).
 * If the first component > 12 it MUST be the day (removes ambiguity).
 * Year range 2015–2035 validates plausibility; anything outside → null.
 * Ambiguous inputs (both components ≤ 12 and year is 2-digit) → null.
 */
function normalizeDate(raw: unknown): string | undefined {
  if (raw === null || raw === undefined) return undefined;
  const str = String(raw).trim();

  // 1. Already ISO YYYY-MM-DD
  const iso = str.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) {
    const [y, m, d] = [Number(iso[1]), Number(iso[2]), Number(iso[3])];
    return isCalendarDate(y, m, d) ? str : undefined;
  }

  // 2. Separated format: up to 4 digits / 1-2 digits / 2-4 digits
  const sep = str.match(/^(\d{1,4})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})$/);
  if (!sep) return undefined;

  const aStr = sep[1];
  const bStr = sep[2];
  const cStr = sep[3];
  if (!aStr || !bStr || !cStr) return undefined;
  const [a, b, c] = [Number(aStr), Number(bStr), Number(cStr)];

  // Case: YYYY/MM/DD (first component is 4-digit year)
  if (aStr.length === 4) {
    return isCalendarDate(a, b, c) ? toISO(a, b, c) : undefined;
  }

  // Resolve year from c
  const year = cStr.length === 2 ? 2000 + c : c;
  if (year < DATE_YEAR_MIN || year > DATE_YEAR_MAX) return undefined;

  // Resolve day/month from a and b (European: a=day, b=month)
  // If a > 12 → unambiguously the day
  if (a > 12) {
    return isCalendarDate(year, b, a) ? toISO(year, b, a) : undefined;
  }
  // If b > 12 → unambiguously the month (unusual, but handle it)
  if (b > 12) {
    return isCalendarDate(year, b, a) ? toISO(year, b, a) : undefined;
  }
  // Both ≤ 12 AND year is 2-digit → genuinely ambiguous → null
  if (cStr.length === 2) return undefined;
  // Both ≤ 12 AND year is 4-digit → apply European convention (a=day, b=month)
  return isCalendarDate(year, b, a) ? toISO(year, b, a) : undefined;
}

/** Maps Gemini's kind output to our enum. */
function normalizeKind(raw: unknown): 'income' | 'expense' | undefined {
  if (raw === null || raw === undefined) return undefined;
  const lower = String(raw).toLowerCase().trim();
  if (['income', 'ingreso', 'ingresos', 'cobro', 'venta'].includes(lower)) return 'income';
  if (['expense', 'gasto', 'gastos', 'pago', 'compra', 'coste'].includes(lower)) return 'expense';
  return undefined;
}

/** Cleans and truncates a string field. */
function str(raw: unknown, maxLen: number): string | undefined {
  if (raw === null || raw === undefined) return undefined;
  const s = String(raw).trim();
  return s.length > 0 ? s.slice(0, maxLen) : undefined;
}

// ── Main normalizer ───────────────────────────────────────────────────────────

type NormalizeResult = {
  readonly data: Partial<InvoiceDraft>;
  readonly fieldErrors: Record<string, string>;
  readonly confidence: Record<string, number>;
};

/**
 * Converts raw Gemini output (any format) to a typed InvoiceDraft.
 * Returns partial data + per-field errors so callers can fill what's valid.
 */
function normalizeInvoiceData(raw: GeminiRaw): NormalizeResult {
  const data: Record<string, unknown> = {};
  const fieldErrors: Record<string, string> = {};
  const confidence: Record<string, number> = {};

  // kind
  const kind = normalizeKind(raw.kind);
  if (kind) {
    data.kind = kind;
    confidence.kind = kind === raw.kind ? 1.0 : 0.85; // high if Gemini used exact value
  } else if (raw.kind !== undefined && raw.kind !== '') {
    fieldErrors.kind = `Valor no reconocido: ${String(raw.kind)}`;
  }

  // number
  const num = str(raw.number, 60);
  if (num) { data.number = num; confidence.number = 0.95; }

  // issueDate — extra care to avoid inversion
  const rawDateStr = raw.issueDate !== undefined ? String(raw.issueDate).trim() : '';
  const date = normalizeDate(raw.issueDate);
  if (date) {
    data.issueDate = date;
    // Lower confidence if we had to convert (original wasn't already ISO)
    confidence.issueDate = /^\d{4}-\d{2}-\d{2}$/.test(rawDateStr) ? 0.95 : 0.7;
  } else if (rawDateStr) {
    fieldErrors.issueDate = `Fecha no reconocida o ambigua: "${rawDateStr}"`;
  }

  // concept
  const concept = str(raw.concept, 2000);
  if (concept) { data.concept = concept; confidence.concept = 0.9; }

  // counterpartyName / issuerNif / issuerName
  const cp = str(raw.counterpartyName, 200);
  if (cp) { data.counterpartyName = cp; confidence.counterpartyName = 0.85; }
  const nif = str(raw.issuerNif, 20);
  if (nif) { data.issuerNif = nif; confidence.issuerNif = 0.9; }
  const iss = str(raw.issuerName, 200);
  if (iss) { data.issuerName = iss; confidence.issuerName = 0.9; }

  // currency
  const rawCurr = str(raw.currency, 10);
  const currMatch = rawCurr?.replace(/[^A-Za-z]/g, '').toUpperCase().slice(0, 3);
  data.currency = currMatch?.length === 3 ? currMatch : 'EUR';
  confidence.currency = currMatch?.length === 3 ? 0.95 : 0.5;

  // amounts
  const net = normalizeMoneyString(raw.netAmount);
  if (net !== undefined) {
    data.netAmount = net;
    confidence.netAmount = String(raw.netAmount) === net ? 1.0 : 0.85;
  } else if (raw.netAmount !== undefined && raw.netAmount !== '') {
    fieldErrors.netAmount = `Importe neto no reconocido: ${String(raw.netAmount)}`;
  }

  const total = normalizeMoneyString(raw.totalAmount);
  if (total !== undefined) {
    data.totalAmount = total;
    confidence.totalAmount = String(raw.totalAmount) === total ? 1.0 : 0.85;
  } else if (raw.totalAmount !== undefined && raw.totalAmount !== '') {
    fieldErrors.totalAmount = `Importe total no reconocido: ${String(raw.totalAmount)}`;
  }

  const vat = normalizePct(raw.vatPct);
  if (vat !== undefined) { data.vatPct = vat; confidence.vatPct = 0.9; }

  const ret = normalizePct(raw.withholdingPct);
  if (ret !== undefined) { data.withholdingPct = ret; confidence.withholdingPct = 0.9; }

  return { data: data as Partial<InvoiceDraft>, fieldErrors, confidence };
}

// ── Public types / function ───────────────────────────────────────────────────

export type FieldConfidence = {
  readonly value: unknown;
  readonly confidence: number; // 0–1
};

export type PdfAiResult = {
  readonly draft: Partial<InvoiceDraft>;
  readonly confidence: Readonly<Record<string, number>>; // field → 0–1
  readonly warnings: readonly string[];
  readonly usedAi: boolean;
};

export async function extractInvoiceWithClaude(
  pdfBuffer: ArrayBuffer,
): Promise<PdfAiResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  logRedacted('info', '[pdf-ai] DIAG-1 api key present:', apiKey ? 'YES' : 'NO');

  if (!apiKey) {
    return {
      draft: {}, confidence: {},
      warnings: ['Extracción IA no disponible (falta GEMINI_API_KEY). Rellena los campos manualmente.'],
      usedAi: false,
    };
  }

  logRedacted('info', '[pdf-ai] DIAG-2 pdf buffer bytes:', String(pdfBuffer.byteLength));

  const { GoogleGenerativeAI } = await import('@google/generative-ai');
  const modelName = process.env.GEMINI_MODEL ?? 'gemini-2.0-flash';
  logRedacted('info', '[pdf-ai] DIAG-3 model:', modelName);
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: modelName });
  const base64Pdf = Buffer.from(pdfBuffer).toString('base64');

  let rawText: string;
  try {
    logRedacted('info', '[pdf-ai] DIAG-3 calling gemini...');
    const result = await model.generateContent([
      { inlineData: { mimeType: 'application/pdf', data: base64Pdf } },
      SYSTEM_PROMPT,
    ]);
    rawText = result.response.text();
    logRedacted('info', '[pdf-ai] DIAG-4 raw (first 400):', rawText.slice(0, 400));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logRedacted('error', '[pdf-ai] DIAG-4 gemini FAILED:', msg);
    const isQuota = msg.includes('429') || msg.toLowerCase().includes('quota') || msg.toLowerCase().includes('too many');
    return {
      draft: {}, confidence: {},
      warnings: [isQuota
        ? 'Límite de peticiones de Gemini alcanzado. Espera un minuto e inténtalo de nuevo.'
        : `Error Gemini: ${msg}.`,
      ],
      usedAi: false,
    };
  }

  // Extract JSON block (Gemini sometimes wraps in ```json ... ```)
  const jsonMatch = rawText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    logRedacted('error', '[pdf-ai] DIAG-5 no JSON block in response');
    return {
      draft: {}, confidence: {},
      warnings: ['La IA no devolvió datos estructurados. Rellena los campos manualmente.'],
      usedAi: true,
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonMatch[0]);
  } catch {
    logRedacted('error', '[pdf-ai] DIAG-5 JSON.parse FAILED');
    return {
      draft: {}, confidence: {},
      warnings: ['La IA devolvió JSON inválido. Rellena los campos manualmente.'],
      usedAi: true,
    };
  }

  // Lenient structural parse — just ensure it's an object
  const rawParsed = geminiRawSchema.safeParse(parsed);
  if (!rawParsed.success) {
    logRedacted('error', '[pdf-ai] DIAG-5 schema failed (not an object?)');
    return {
      draft: {}, confidence: {},
      warnings: ['La IA devolvió un formato inesperado. Rellena los campos manualmente.'],
      usedAi: true,
    };
  }

  logRedacted('info', '[pdf-ai] DIAG-5 raw keys:', Object.keys(rawParsed.data).join(','));

  // Normalize field by field — partial data is fine
  const { data: draft, fieldErrors, confidence } = normalizeInvoiceData(rawParsed.data);

  logRedacted('info', '[pdf-ai] DIAG-6 normalized keys:', Object.keys(draft).join(','));
  if (Object.keys(fieldErrors).length > 0) {
    logRedacted('info', '[pdf-ai] DIAG-6 field errors:', JSON.stringify(fieldErrors));
  }

  // IBAN / SWIFT → notes
  const iban  = str((rawParsed.data as Record<string, unknown>).iban,  50);
  const swift = str((rawParsed.data as Record<string, unknown>).swift, 20);
  if (iban || swift) {
    const lines: string[] = [];
    if (iban)  lines.push(`IBAN: ${iban}`);
    if (swift) lines.push(`SWIFT/BIC: ${swift}`);
    (draft as Record<string, unknown>).notes = lines.join('\n');
  }

  // SocialPro signal fallback for kind
  if (!draft.kind) {
    const issuerText = `${draft.issuerName ?? ''} ${draft.issuerNif ?? ''}`.toUpperCase();
    const isSocialPro = SOCIALPRO_SIGNALS.some((s) => issuerText.includes(s.toUpperCase()));
    if (isSocialPro) (draft as Record<string, unknown>).kind = 'income';
  }

  // Build user-facing warnings from field errors + missing required fields
  const warnings: string[] = [];
  for (const [field, msg] of Object.entries(fieldErrors)) {
    warnings.push(`Campo "${field}": ${msg} — revísalo.`);
  }
  if (!draft.concept)     warnings.push('No se detectó concepto — revísalo.');
  if (!draft.netAmount)   warnings.push('No se detectó importe neto — revísalo.');
  if (!draft.totalAmount) warnings.push('No se detectó importe total — revísalo.');
  if (!draft.issueDate)   warnings.push('No se detectó fecha de emisión — revísala.');
  if (!draft.kind)        warnings.push('No se determinó tipo (ingreso/gasto) — selecciónalo.');

  return { draft, confidence, warnings, usedAi: true };
}
