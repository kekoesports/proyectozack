/**
 * Parser del mensaje de trato que se publica en #pipeline-deals.
 *
 * El formato es fijo y lo escribe el equipo a mano, así que se parsea de forma
 * determinista: sin red, sin modelo, y por tanto testeable de principio a fin.
 * `parseDiscordDealMessage` no inventa datos — lo que no reconoce lo deja fuera
 * y `getAutomationDealMissingFields` se encarga de que el borrador aterrice
 * como `missing_info` para que lo revise una persona.
 *
 * Formato esperado:
 *
 *   NUEVO DEAL
 *
 *   Creador: The Real Fer
 *   Handle: @thereelfer
 *   Marca: SkinsMonkey
 *   Estado: aprobada
 *   Moneda: EUR
 *
 *   Importe marca total: 12000
 *   Pago creador total: 5000
 *   Producto: 0
 *   Sorteos: 0
 *
 *   Fecha de inicio: 20/08/2026
 *   Fecha de finalización: 30/12/2026
 *
 *   Entregables:
 *   - Preroll YouTube: 30
 *   - Vídeo dedicado YouTube: 2
 *
 *   Cadencia:
 *   - 5 prerolls al mes durante 6 meses
 *
 *   Notas:
 *   - Sin streams.
 */

import { CAMPAIGN_STATUSES, type CampaignStatus } from '@/lib/schemas/campaign';
import { type DeliverableType } from '@/lib/schemas/deliverable';
import { SOCIAL_PLATFORM_VALUES } from '@/lib/schemas/talentSocials';

type SocialPlatform = (typeof SOCIAL_PLATFORM_VALUES)[number];

export type DiscordDealParseResult = {
  /** Encaje parcial de AutomationDealCreate. Se valida aguas abajo con Zod. */
  readonly proposedDeal: Record<string, unknown>;
  /** Problemas legibles para quien revise el borrador. */
  readonly warnings: readonly string[];
  /** false cuando el texto ni siquiera parece un mensaje de trato. */
  readonly looksLikeDeal: boolean;
};

/** Quita acentos y pasa a minúsculas, para comparar etiquetas sin sorpresas. */
function fold(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * Placeholders de plantilla sin rellenar. `@HANDLE_EXACTO` llegó así en un
 * mensaje real: parece un valor, pero es un hueco. Cuenta como campo vacío.
 */
function isPlaceholder(value: string): boolean {
  const bare = value.replace(/^@/, '').trim();
  if (bare.length === 0) return true;
  if (/^[-_.]+$/.test(bare)) return true;
  const folded = fold(bare);
  if (['tbd', 'tba', 'pendiente', 'n/a', 'na', 'xxx', 'todo', '???'].includes(folded)) return true;
  // MAYÚSCULAS con separadores y sin minúsculas: HANDLE_EXACTO, NOMBRE-MARCA…
  return /^[A-Z0-9]+([_-][A-Z0-9]+)+$/.test(bare);
}

/** Lee `Etiqueta: valor` en cualquier línea, sin distinguir acentos ni mayúsculas. */
function readField(lines: readonly string[], ...labels: readonly string[]): string | null {
  const wanted = labels.map(fold);
  for (const line of lines) {
    const idx = line.indexOf(':');
    if (idx === -1) continue;
    const label = fold(line.slice(0, idx));
    if (!wanted.includes(label)) continue;
    const value = line.slice(idx + 1).trim();
    if (value.length === 0 || isPlaceholder(value)) return null;
    return value;
  }
  return null;
}

/**
 * Importe en euros. Acepta `12000`, `12.000`, `12,000.50`, `1 200 €`.
 * Devuelve null si no hay dígitos: un importe ausente no es 0.
 */
function readAmount(raw: string | null): number | null {
  if (raw === null) return null;
  const cleaned = raw.replace(/[€$\s]/g, '');
  if (!/\d/.test(cleaned)) return null;
  // El último separador con 1-2 decimales manda; el resto son miles.
  const decimalMatch = cleaned.match(/^(.*)[.,](\d{1,2})$/);
  const normalized = decimalMatch
    ? `${(decimalMatch[1] ?? '').replace(/[.,]/g, '')}.${decimalMatch[2]}`
    : cleaned.replace(/[.,]/g, '');
  const value = Number(normalized);
  return Number.isFinite(value) && value >= 0 ? value : null;
}

/**
 * `dd/mm/yyyy` → `yyyy-mm-dd`, rechazando fechas que no existen.
 *
 * Esto es deliberado: `new Date(2027, 1, 30)` devuelve el 2 de marzo sin avisar,
 * así que una errata como `30/02/2027` se colaría como una fecha válida y
 * silenciosamente equivocada. Se validan los componentes a mano.
 */
export function parseSpanishDate(raw: string | null): { iso: string | null; invalid: boolean } {
  if (raw === null) return { iso: null, invalid: false };
  const match = raw.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
  if (!match) return { iso: null, invalid: true };
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  if (month < 1 || month > 12) return { iso: null, invalid: true };
  const leap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  const daysInMonth = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  const max = daysInMonth[month - 1] ?? 31;
  if (day < 1 || day > max) return { iso: null, invalid: true };
  const pad = (n: number): string => String(n).padStart(2, '0');
  return { iso: `${year}-${pad(month)}-${pad(day)}`, invalid: false };
}

/** Etiquetas de entregable → tipo canónico. El orden importa: gana la primera. */
const DELIVERABLE_PATTERNS: readonly (readonly [RegExp, DeliverableType])[] = [
  [/preroll/, 'preroll'],
  [/(video|vídeo).*(dedicad|youtube|yt)|youtube.*(video|vídeo)/, 'video_youtube'],
  [/(short|reel|tiktok)/, 'short_reel_tiktok'],
  [/(story|historia).*(instagram|ig)/, 'story_instagram'],
  [/(post|publicacion).*(instagram|ig)/, 'post_instagram'],
  [/(tweet|twitter|post.*\bx\b)/, 'tweet_x'],
  [/(integracion|stream|directo|live)/, 'stream_integration'],
  [/pack.*mensual/, 'pack_mensual'],
  [/pack.*trimestral/, 'pack_trimestral'],
];

function classifyDeliverable(label: string): DeliverableType {
  const folded = fold(label);
  for (const [pattern, type] of DELIVERABLE_PATTERNS) {
    if (pattern.test(folded)) return type;
  }
  return 'otro';
}

/** Plataforma implícita en los entregables. Sin señal clara, no se inventa. */
function inferPlatform(types: readonly DeliverableType[], rawLabels: readonly string[]): SocialPlatform | null {
  const labels = rawLabels.map(fold).join(' ');
  if (types.includes('video_youtube') || /youtube|\byt\b/.test(labels)) return 'youtube';
  if (types.includes('stream_integration') || types.includes('preroll')) {
    if (/kick/.test(labels)) return 'kick';
    return 'twitch';
  }
  if (types.includes('short_reel_tiktok') && /tiktok/.test(labels)) return 'tiktok';
  if (types.includes('story_instagram') || types.includes('post_instagram')) return 'instagram';
  if (types.includes('tweet_x')) return 'x';
  return null;
}

/** Devuelve las viñetas de una sección hasta la siguiente cabecera. */
function readSection(lines: readonly string[], ...labels: readonly string[]): string[] {
  const wanted = labels.map(fold);
  const start = lines.findIndex((line) => {
    const head = fold(line.replace(/:contentReference[^]*$/, '').split(':')[0] ?? '');
    return wanted.includes(head) && line.trim().endsWith(':');
  });
  if (start === -1) return [];
  const out: string[] = [];
  for (const line of lines.slice(start + 1)) {
    const trimmed = line.trim();
    if (trimmed.length === 0) continue;
    // Otra cabecera de sección corta el bloque.
    if (/^[^-•*].*:$/.test(trimmed)) break;
    if (/^[-•*]\s*/.test(trimmed)) out.push(trimmed.replace(/^[-•*]\s*/, ''));
    else break;
  }
  return out;
}

export function parseDiscordDealMessage(rawText: string): DiscordDealParseResult {
  const lines = rawText.split(/\r?\n/);
  const warnings: string[] = [];

  const creator = readField(lines, 'creador', 'talento', 'creator');
  const brand = readField(lines, 'marca', 'brand');
  const looksLikeDeal =
    /nuevo\s+deal/i.test(rawText) || (creator !== null && brand !== null);
  if (!looksLikeDeal) {
    return { proposedDeal: {}, warnings: ['El mensaje no parece un trato.'], looksLikeDeal: false };
  }

  const handleRaw = readField(lines, 'handle', 'usuario', 'nick');
  if (handleRaw === null) warnings.push('Falta el handle del creador (o es un placeholder sin rellenar).');

  // Entregables: "- Etiqueta: 12"
  const deliverables: { type: DeliverableType; targetCount: number; notes?: string }[] = [];
  const deliverableLabels: string[] = [];
  for (const entry of readSection(lines, 'entregables', 'deliverables')) {
    const idx = entry.lastIndexOf(':');
    if (idx === -1) {
      warnings.push(`Entregable sin cantidad: "${entry}".`);
      continue;
    }
    const label = entry.slice(0, idx).trim();
    const count = Number(entry.slice(idx + 1).replace(/[^\d]/g, ''));
    if (!Number.isInteger(count) || count < 1) {
      warnings.push(`Cantidad no válida en el entregable "${label}".`);
      continue;
    }
    deliverableLabels.push(label);
    deliverables.push({ type: classifyDeliverable(label), targetCount: count, notes: label });
  }
  if (deliverables.length === 0) warnings.push('No se ha reconocido ningún entregable.');

  const start = parseSpanishDate(readField(lines, 'fecha de inicio', 'inicio', 'start'));
  const end = parseSpanishDate(
    readField(lines, 'fecha de finalizacion', 'fecha de fin', 'fin', 'end'),
  );
  if (start.invalid) warnings.push('La fecha de inicio no es una fecha válida.');
  if (end.invalid) warnings.push('La fecha de finalización no es una fecha válida (revisa el día del mes).');
  if (start.iso && end.iso && end.iso < start.iso) {
    warnings.push('La fecha de finalización es anterior a la de inicio.');
  }

  const statusRaw = readField(lines, 'estado', 'status');
  let status: CampaignStatus | undefined;
  if (statusRaw !== null) {
    const found = CAMPAIGN_STATUSES.find((value) => fold(value) === fold(statusRaw));
    if (found) status = found;
    else warnings.push(`Estado no reconocido: "${statusRaw}".`);
  }

  const currencyRaw = readField(lines, 'moneda', 'currency');
  let currency: 'EUR' | 'USD' | undefined;
  if (currencyRaw !== null) {
    const folded = fold(currencyRaw);
    if (folded.includes('eur') || currencyRaw.includes('€')) currency = 'EUR';
    else if (folded.includes('usd') || currencyRaw.includes('$')) currency = 'USD';
    else warnings.push(`Moneda no reconocida: "${currencyRaw}".`);
  }

  const amountBrand = readAmount(readField(lines, 'importe marca total', 'importe marca', 'importe'));
  const amountTalent = readAmount(readField(lines, 'pago creador total', 'pago creador', 'pago talento'));
  const inKindTalent = readAmount(readField(lines, 'producto', 'producto talento'));
  const inKindCommunity = readAmount(readField(lines, 'sorteos', 'sorteo', 'giveaways'));
  if (amountBrand !== null && amountTalent !== null && amountBrand > 0 && amountTalent > amountBrand) {
    warnings.push('El pago al creador supera el importe de la marca.');
  }

  const cadence = readSection(lines, 'cadencia', 'cadence');
  const notesSection = readSection(lines, 'notas', 'notes');
  const notes = [...cadence.map((c) => `Cadencia: ${c}`), ...notesSection].join('\n');

  const platform = inferPlatform(deliverables.map((d) => d.type), deliverableLabels);
  if (platform === null && deliverables.length > 0) {
    warnings.push('No se ha podido deducir la plataforma del creador.');
  }

  const talent: Record<string, unknown> = {};
  if (creator !== null) talent.name = creator;
  if (handleRaw !== null) talent.handle = handleRaw.replace(/^@/, '');
  if (platform !== null) talent.platform = platform;
  if (Object.keys(talent).length > 0) talent.createIfMissing = true;

  const proposedDeal: Record<string, unknown> = {};
  if (creator !== null && brand !== null) proposedDeal.name = `${creator} x ${brand}`;
  if (brand !== null) proposedDeal.brand = { name: brand, createIfMissing: true };
  if (Object.keys(talent).length > 0) proposedDeal.talent = talent;
  if (status !== undefined) proposedDeal.status = status;
  if (currency !== undefined) proposedDeal.currency = currency;
  if (start.iso !== null) proposedDeal.startDate = start.iso;
  else if (start.invalid) {
    // Conserva el valor problemático para que AutomationDealCreate señale
    // `startDate` y el borrador aterrice como missing_info. Omitirlo haría que
    // una fecha escrita pero imposible pareciese simplemente opcional.
    proposedDeal.startDate = readField(lines, 'fecha de inicio', 'inicio', 'start');
  }
  if (end.iso !== null) proposedDeal.endDate = end.iso;
  else if (end.invalid) {
    proposedDeal.endDate = readField(
      lines,
      'fecha de finalizacion',
      'fecha de fin',
      'fin',
      'end',
    );
  }
  if (amountBrand !== null) proposedDeal.amountBrand = amountBrand;
  if (amountTalent !== null) proposedDeal.amountTalent = amountTalent;
  if (inKindTalent !== null) proposedDeal.amountInKindTalent = inKindTalent;
  if (inKindCommunity !== null) proposedDeal.amountInKindCommunity = inKindCommunity;
  if (deliverables.length > 0) proposedDeal.deliverables = deliverables;
  if (notes.length > 0) proposedDeal.notes = notes.slice(0, 5000);

  return { proposedDeal, warnings, looksLikeDeal: true };
}
