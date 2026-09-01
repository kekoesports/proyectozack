const DEFAULT_TALENT_LABEL = 'creator';

export const DEFAULT_INVOICE_PAYMENT_TERMS_EN =
  'Payment due within 30 days of the issue date.';

export const DEFAULT_INVOICE_LEGAL_NOTE_EN =
  'Invoice issued for digital marketing services. Review tax treatment before issuing.';

export function buildDealInvoiceConcept(
  talentName: string | null | undefined,
): string {
  const talent = talentName?.trim() || DEFAULT_TALENT_LABEL;
  return `Digital marketing services - ${talent}`;
}

export function normalizeDealInvoiceLineForPdf(
  line: { readonly concept: string; readonly description: string | null },
  language: 'es' | 'en',
  talentName?: string | null,
): { readonly concept: string; readonly description: string | null } {
  if (language !== 'en' || !isAutomaticallyGeneratedDealConcept(line.concept)) {
    return line;
  }

  return {
    concept: buildDealInvoiceConcept(talentName),
    // Only the deliberately sanitised deliverables summary is client-facing.
    // Legacy deal notes may contain pricing, splits or in-kind compensation.
    description: safeDeliverablesDescription(line.description),
  };
}

function safeDeliverablesDescription(description: string | null): string | null {
  if (!description) return null;

  const normalized = description.trim().replace(/\s+/g, ' ');
  if (!/^Campaign deliverables:\s+.+/i.test(normalized)) return null;

  const forbiddenCommercialTerms =
    /[€$£%]|\b(?:EUR|USD|GBP|CHF|price|rate|fee|split|commission|skins?|giveaways?|gift\s*cards?|crypto)\b/i;

  return forbiddenCommercialTerms.test(normalized) ? null : normalized;
}

export function localizeKnownInvoiceText(
  value: string | null | undefined,
  language: 'es' | 'en',
): string | null | undefined {
  if (language !== 'en' || !value) return value;

  const knownEnglishCopy: Readonly<Record<string, string>> = {
    'Pago a 30 días desde la fecha de emisión': DEFAULT_INVOICE_PAYMENT_TERMS_EN,
    'Factura emitida por servicios de marketing digital.':
      'Invoice issued for digital marketing services.',
    'Borrador de factura por servicios de marketing digital. Revisar fiscalidad antes de emitir.':
      DEFAULT_INVOICE_LEGAL_NOTE_EN,
  };

  return knownEnglishCopy[value.trim()] ?? value;
}

export function localizeCountryName(
  country: string | null | undefined,
  language: 'es' | 'en',
): string | null | undefined {
  if (language !== 'en' || !country) return country;

  const knownCountries: Readonly<Record<string, string>> = {
    Alemania: 'Germany',
    España: 'Spain',
    Francia: 'France',
    Italia: 'Italy',
    Portugal: 'Portugal',
  };

  return knownCountries[country.trim()] ?? country;
}

function isAutomaticallyGeneratedDealConcept(concept: string): boolean {
  const normalized = concept.trim().toLocaleLowerCase('es');
  return normalized.startsWith('campaña de marketing digital')
    || normalized.startsWith('digital marketing campaign')
    || normalized.startsWith('digital marketing services');
}
