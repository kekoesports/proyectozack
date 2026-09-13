import type { DiscordDealParseResult } from '@/lib/parsers/discordDeal';
import type { DeliverableType } from '@/lib/schemas/deliverable';

const CONTENT_TYPES: Readonly<Record<string, DeliverableType>> = {
  stream: 'stream_integration', streams: 'stream_integration',
  preroll: 'preroll', prerolls: 'preroll',
  video: 'video_youtube', videos: 'video_youtube',
  short: 'short_reel_tiktok', shorts: 'short_reel_tiktok',
};

/** Operations format: BRAND: CREATOR - 100$ PARA SOCIALPRO - 50$ PARA CREATOR. */
export function parseInlineDiscordDeal(raw: string): DiscordDealParseResult | null {
  const [header = '', ...lines] = raw.trim().split(/\r?\n/);
  const match = header.match(/^([^:]{1,200}):\s*([^:]{1,100}?)\s+-\s+([\d., ]+)\s*([$€])\s+PARA\s+SOCIALPRO\s+-\s+([\d., ]+)\s*([$€])\s+PARA\s+(.+)$/iu);
  if (!match) return null;
  const [, brand = '', creator = '', agency = '', agencyCurrency, pay = '', payCurrency, payee = ''] = match;
  const normalize = (value: string): string => value.trim().replace(/^@/, '').toLocaleLowerCase();
  const amount = (value: string): number | undefined => {
    const clean = value.replace(/\s/g, '');
    if (/^\d+(?:[.,]\d{1,2})?$/.test(clean)) return Number(clean.replace(',', '.'));
    // Ambiguous separators stay invalid instead of guessing a commercial amount.
    return undefined;
  };
  const warnings: string[] = [];
  const content = lines.join(' ').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  const pattern = /(\d+)\s+(streams?|prerolls?|videos?(?:\s+dedicados?)?|shorts?)\b/giu;
  const deliverables: Array<{ type: DeliverableType; targetCount: number }> = [];
  for (const entry of content.matchAll(pattern)) {
    const type = CONTENT_TYPES[(entry[2] ?? '').toLowerCase().split(/\s/)[0] ?? ''];
    if (!type) continue;
    const targetCount = Number(entry[1]);
    const previous = deliverables.find((row) => row.type === type);
    if (previous) previous.targetCount += targetCount;
    else deliverables.push({ type, targetCount });
  }
  const rest = content.replace(pattern, '').replace(/\b(?:y|e)\b/giu, '').replace(/[\s,+;.-]/g, '');
  if (rest) warnings.push('Hay contenido adicional que necesita revisión.');
  if (normalize(creator) !== normalize(payee)) warnings.push('El destinatario del pago no coincide con el creador.');
  if (agencyCurrency !== payCurrency) warnings.push('Los importes usan monedas distintas.');
  if (amount(agency) === undefined || amount(pay) === undefined) warnings.push('Revisa el formato de los importes.');
  if (deliverables.length === 0) warnings.push('Faltan los entregables.');
  return {
    looksLikeDeal: true,
    warnings,
    proposedDeal: {
      name: `${creator.trim()} x ${brand.trim()}`,
      brand: { name: brand.trim(), createIfMissing: true },
      // The CRM resolves the real talent by name; a name is not an invented handle.
      talent: { name: creator.trim() },
      currency: agencyCurrency === '$' ? 'USD' : 'EUR',
      amountBrand: amount(agency), amountTalent: amount(pay), deliverables,
    },
  };
}
