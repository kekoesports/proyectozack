import type { DiscordDealParseResult } from '@/lib/parsers/discordDeal';
import type { DeliverableType } from '@/lib/schemas/deliverable';

const TYPES: Readonly<Record<string, DeliverableType>> = {
  stream: 'stream_integration', preroll: 'preroll', video: 'video_youtube', short: 'short_reel_tiktok',
};
const MONEY = '(\\d+(?:[.,]\\d+)*)';
/** Spanish grouping is accepted only with EUR, never inferred for dollar amounts. */
function amount(value: string, currency: string): number | undefined {
  if (/^\d+(?:[.,]\d{1,2})?$/.test(value)) return Number(value.replace(',', '.'));
  if (currency === 'EUR' && /^\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?$/.test(value)) {
    return Number(value.replace(/\./g, '').replace(',', '.'));
  }
  return undefined;
}

/** Tab/paste format with an explicit total and a checked agency commission. */
export function parseParagraphDiscordDeal(raw: string): DiscordDealParseResult | null {
  const text = raw.trim().replace(/\s+/g, ' ');
  const header = text.match(/^([^:\n]{1,200}):\s*([^:]{1,100}?)\s+(?=\d+\s+(?:streams?|prerolls?|videos?|shorts?)\b)/iu);
  if (!header) return null;
  const brand = header[1]?.trim() ?? '';
  const creatorHeader = header[2]?.trim() ?? '';
  const edition = creatorHeader.match(/\s+#([1-9]\d{0,2})$/)?.[1];
  const creator = creatorHeader.replace(/\s+#[1-9]\d{0,2}$/, '');
  let remainder = text.slice(header[0].length);
  const deliverables: Array<{ type: DeliverableType; targetCount: number }> = [];
  while (true) {
    const content = remainder.match(/^(\d+)\s+(stream|preroll|video|short)s?\b\s*[,;]?\s*/iu);
    if (!content) break;
    const type = TYPES[content[2]?.toLowerCase() ?? ''];
    if (!type) break;
    const previous = deliverables.find((row) => row.type === type);
    if (previous) previous.targetCount += Number(content[1]);
    else deliverables.push({ type, targetCount: Number(content[1]) });
    remainder = remainder.slice(content[0].length);
  }
  const total = remainder.match(new RegExp('^' + MONEY + '\\s*(€|EUR|USD|\\$)\\s*', 'iu'));
  const currency = total?.[2] === '€' || total?.[2]?.toUpperCase() === 'EUR' ? 'EUR' : 'USD';
  const amountBrand = total ? amount(total[1] ?? '', currency) : undefined;
  if (total) remainder = remainder.slice(total[0].length);
  const warnings: string[] = [];
  if (amountBrand === undefined) warnings.push('Falta el importe total y su moneda, o el formato es ambiguo.');
  const commission = remainder.normalize('NFD').replace(/[\u0300-\u036f]/g, '').match(
    new RegExp('^(?:(\\d+(?:[.,]\\d+)*)\\s*(USD|EUR|€|\\$)\\s+en skins\\s+y\\s+)?(?:el\\s+)?(\\d+(?:[.,]\\d{1,2})?)%\\s+de comision para nosotros(?:\\s+que son\\s+' + MONEY + '\\s*(€|EUR|USD|\\$)\\s+para nosotros)?[.!]?$','iu'),
  );
  let amountTalent: number | undefined;
  if (commission && amountBrand !== undefined) {
    const pct = Number(commission[3]?.replace(',', '.'));
    const fee = Math.round(amountBrand * pct) / 100;
    const explicitCurrency = commission[5] === '€' || commission[5]?.toUpperCase() === 'EUR' ? 'EUR' : 'USD';
    if (pct < 0 || pct > 100 || !Number.isFinite(pct)) warnings.push('La comisión debe estar entre 0 y 100 %.');
    else if (commission[4] && (explicitCurrency !== currency || amount(commission[4], currency) !== fee)) {
      warnings.push('La comisión indicada no coincide con el porcentaje del total o usa otra moneda.');
    } else amountTalent = Math.round((amountBrand - fee) * 100) / 100;
  } else warnings.push('Indica el pago al creador o una comisión inequívoca de SocialPro.');
  return { looksLikeDeal: true, warnings, proposedDeal: {
    name: `${creator} x ${brand}${edition ? ` #${edition}` : ''}`,
    brand: { name: brand }, talent: { name: creator }, deliverables,
    ...(total ? { currency } : {}), amountBrand, amountTalent,
    // Preserve skins in their stated currency; never convert them to EUR cash.
    notes: `Mensaje original de pipeline-deals: ${raw.trim()}`.slice(0, 5000),
  } };
}

/** Plausible deals must reach review rather than silently disappearing. */
export function unrecognizedDiscordDeal(raw: string): DiscordDealParseResult | null {
  if (!/\b(?:trato|acuerdo|streams?|prerolls?|shorts?|videos?)\b/iu.test(raw)
    || !/(?:\d\s*(?:€|\$|EUR\b|USD\b)|(?:marca|creador)\s*:)/iu.test(raw)) return null;
  return { looksLikeDeal: true, proposedDeal: { notes: raw.slice(0, 5000) }, warnings: [
    'Parece un trato, pero no he podido interpretar todos los datos. Revisa marca, creador, importes y entregables en el borrador.',
  ] };
}
