'server-only';

// Enmascara datos sensibles antes de exponerlos en respuestas IA.
// Toda salida de tools pasa por estas funciones.

export function maskIban(iban: string): string {
  if (!iban || iban.length < 8) return '****';
  const clean = iban.replace(/\s/g, '');
  return `${clean.slice(0, 4)} **** **** ${clean.slice(-4)}`;
}

export function maskTaxId(taxId: string): string {
  if (!taxId || taxId.length < 4) return '****';
  return `${taxId.slice(0, 2)}****${taxId.slice(-2)}`;
}

export function maskEmail(email: string): string {
  const at = email.indexOf('@');
  if (at <= 0) return '****@****';
  const local = email.slice(0, at);
  const domain = email.slice(at);
  if (local.length <= 2) return `${local[0]}*${domain}`;
  return `${local[0]}${'*'.repeat(Math.min(local.length - 2, 4))}${local.slice(-1)}${domain}`;
}

// Elimina campos sensibles de un objeto banco/pago
export function maskBankDetails(raw: string | null | undefined): string | null {
  if (!raw) return null;
  // Reemplaza IBANs completos
  return raw.replace(/[A-Z]{2}\d{2}[\s\d]{10,26}/g, (match) => maskIban(match));
}
