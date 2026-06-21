'server-only';

import { maskIban, maskEmail, maskTaxId } from './mask';

export { maskIban, maskEmail, maskTaxId, maskBankDetails } from './mask';

const MAX_STRING_LEN = 400;
const MAX_ARRAY_ROWS = 25;

export function truncateText(s: string, max = MAX_STRING_LEN): string {
  if (s.length <= max) return s;
  return `${s.slice(0, max)}… [truncado]`;
}

export function limitArrayRows<T>(arr: readonly T[], max = MAX_ARRAY_ROWS): readonly T[] {
  if (arr.length <= max) return arr;
  return arr.slice(0, max);
}

// Fragmentos de nombre de clave que indican datos sensibles
const SENSITIVE_KEY_FRAGMENTS = [
  'password', 'passwd', 'secret', 'token', 'apikey', 'api_key',
  'iban', 'taxid', 'tax_id', 'fiscal', 'credential', 'privatekey', 'private_key',
];

function isSensitiveKey(key: string): boolean {
  const normalized = key.toLowerCase().replace(/[-_\s]/g, '');
  return SENSITIVE_KEY_FRAGMENTS.some((f) => normalized.includes(f.replace(/_/g, '')));
}

// Sanitiza recursivamente un valor antes de enviarlo al modelo IA.
// Enmascara IBANs/emails/tax IDs en strings, trunca textos largos,
// limita arrays, y redacta claves de objetos marcadas como sensibles.
export function sanitizeToolOutput(value: unknown): unknown {
  if (value === null || value === undefined) return value;

  if (typeof value === 'string') {
    let s = truncateText(value);
    s = s.replace(/[A-Z]{2}\d{2}[\s\d]{10,26}/g, (m) => maskIban(m));
    s = s.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, (m) => maskEmail(m));
    s = s.replace(/\b[A-Z]\d{7}[A-Z0-9]\b/g, (m) => maskTaxId(m));
    return s;
  }

  if (typeof value === 'number' || typeof value === 'boolean') return value;

  if (Array.isArray(value)) {
    return limitArrayRows(value, MAX_ARRAY_ROWS).map(sanitizeToolOutput);
  }

  if (typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      result[k] = isSensitiveKey(k) ? '[redactado]' : sanitizeToolOutput(v);
    }
    return result;
  }

  return value;
}
