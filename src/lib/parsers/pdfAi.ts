// Gemini-powered PDF invoice extractor (free tier: 1500 req/day).
// Falls back gracefully when GEMINI_API_KEY is not set.
// Dynamic import keeps @google/generative-ai out of the module init phase.
import 'server-only';

import { z } from 'zod';
import { logRedacted } from '@/lib/log';
import type { InvoiceDraft } from '@/lib/schemas/invoiceDraft';

// SocialPro issuer identifiers — if any of these appear as the invoice issuer → income.
const SOCIALPRO_SIGNALS = [
  'PLAYMAKER MEDIA LLC',
  'THE AGENT',
  'ElevateX Agency',
  'ElevateX Agencia',
  'B21821046',
  '98-1925044',
];

const SYSTEM_PROMPT = `Eres un extractor de datos de facturas para SocialPro, agencia de talentos.

Las entidades de SocialPro son (cuando SocialPro es el EMISOR de la factura → kind "income"; cuando SocialPro es el RECEPTOR que la paga → kind "expense"):
- ElevateX Agency PA SL · NIF B21821046 (España)
- PLAYMAKER MEDIA LLC / THE AGENT · EIN 98-1925044 (USA)

Extrae los datos de esta factura y devuelve SOLO el JSON con estos campos (todos los que puedas leer):

{
  "kind": "income" o "expense",
  "number": "número de factura como string",
  "issueDate": "YYYY-MM-DD",
  "concept": "descripción del servicio o producto",
  "counterpartyName": "nombre del cliente o proveedor (la otra parte, no SocialPro)",
  "issuerNif": "NIF, CIF o EIN del emisor",
  "issuerName": "razón social del emisor",
  "netAmount": "importe sin IVA como decimal con punto (ej: 9245.00)",
  "vatPct": "% de IVA como decimal (ej: 0.00 o 21.00)",
  "withholdingPct": "% de retención como decimal (ej: 0.00 o 15.00)",
  "totalAmount": "importe total como decimal con punto",
  "currency": "código ISO 3 letras (EUR, USD...)"
}

Responde ÚNICAMENTE con el objeto JSON, sin texto adicional ni markdown.`;

// Loose schema to validate Gemini's JSON output before trusting it.
const aiOutputSchema = z.object({
  kind: z.enum(['income', 'expense']).optional(),
  number: z.string().max(60).optional(),
  issueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  concept: z.string().max(2000).optional(),
  counterpartyName: z.string().max(200).optional(),
  issuerNif: z.string().max(20).optional(),
  issuerName: z.string().max(200).optional(),
  netAmount: z.string().optional(),
  vatPct: z.string().optional(),
  withholdingPct: z.string().optional(),
  totalAmount: z.string().optional(),
  currency: z.string().length(3).optional(),
});

type AiOutput = z.infer<typeof aiOutputSchema>;

function normalizeMoneyString(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  // Accept ES format "1.234,56" → "1234.56"
  const normalized = raw.replace(/\./g, '').replace(',', '.');
  return /^\d+(\.\d{1,2})?$/.test(normalized) ? normalized : undefined;
}

function buildDraftFromAi(data: AiOutput): Partial<InvoiceDraft> {
  const draft: Record<string, unknown> = {};
  if (data.kind)             draft.kind             = data.kind;
  if (data.number)           draft.number           = data.number;
  if (data.issueDate)        draft.issueDate        = data.issueDate;
  if (data.concept)          draft.concept          = data.concept;
  if (data.counterpartyName) draft.counterpartyName = data.counterpartyName;
  if (data.issuerNif)        draft.issuerNif        = data.issuerNif;
  if (data.issuerName)       draft.issuerName       = data.issuerName;
  if (data.currency)         draft.currency         = data.currency;

  const net   = normalizeMoneyString(data.netAmount);
  const total = normalizeMoneyString(data.totalAmount);
  const vat   = normalizeMoneyString(data.vatPct);
  const ret   = normalizeMoneyString(data.withholdingPct);

  if (net)   draft.netAmount      = net;
  if (total) draft.totalAmount    = total;
  if (vat)   draft.vatPct         = vat;
  if (ret)   draft.withholdingPct = ret;

  return draft as Partial<InvoiceDraft>;
}

export type PdfAiResult = {
  readonly draft: Partial<InvoiceDraft>;
  readonly warnings: readonly string[];
  readonly usedAi: boolean;
};

export async function extractInvoiceWithClaude(
  pdfBuffer: ArrayBuffer,
): Promise<PdfAiResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return {
      draft: {},
      warnings: ['Extracción IA no disponible (falta GEMINI_API_KEY). Rellena los campos manualmente.'],
      usedAi: false,
    };
  }

  const { GoogleGenerativeAI } = await import('@google/generative-ai');
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
  const base64Pdf = Buffer.from(pdfBuffer).toString('base64');

  let rawText: string;
  try {
    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: 'application/pdf',
          data: base64Pdf,
        },
      },
      SYSTEM_PROMPT,
    ]);
    rawText = result.response.text();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logRedacted('error', '[pdf-ai] gemini call failed:', msg);
    return {
      draft: {},
      warnings: [`Error al llamar a la IA: ${msg}. Rellena los campos manualmente.`],
      usedAi: false,
    };
  }

  // Extract JSON block — model sometimes wraps output in ```json ... ```
  const jsonMatch = rawText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return {
      draft: {},
      warnings: ['La IA no devolvió datos estructurados. Rellena los campos manualmente.'],
      usedAi: true,
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonMatch[0]);
  } catch {
    return {
      draft: {},
      warnings: ['La IA devolvió JSON inválido. Rellena los campos manualmente.'],
      usedAi: true,
    };
  }

  const validated = aiOutputSchema.safeParse(parsed);
  if (!validated.success) {
    return {
      draft: {},
      warnings: ['Datos extraídos por la IA no superaron validación. Rellena los campos manualmente.'],
      usedAi: true,
    };
  }

  const draft = buildDraftFromAi(validated.data);
  const warnings: string[] = [];

  if (!draft.concept)     warnings.push('No se detectó concepto/descripción — revísalo.');
  if (!draft.netAmount)   warnings.push('No se detectó importe neto — revísalo.');
  if (!draft.totalAmount) warnings.push('No se detectó importe total — revísalo.');
  if (!draft.issueDate)   warnings.push('No se detectó fecha de emisión — revísala.');

  // Fallback kind detection using known SocialPro signals
  if (!draft.kind) {
    const issuerText = `${draft.issuerName ?? ''} ${draft.issuerNif ?? ''}`.toUpperCase();
    const isSocialPro = SOCIALPRO_SIGNALS.some((s) => issuerText.includes(s.toUpperCase()));
    if (isSocialPro) {
      (draft as Record<string, unknown>).kind = 'income';
    } else {
      warnings.push('No se pudo determinar si es ingreso o gasto — selecciónalo manualmente.');
    }
  }

  return { draft, warnings, usedAi: true };
}
