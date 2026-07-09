/**
 * Parseo de importes en formato español/contable.
 *
 * El Libro Mayor de Sage/Contasol exporta números con formato:
 *   "1,234.56"   → 1234.56  (punto decimal + coma miles — inglés)
 *   "1.234,56"   → 1234.56  (coma decimal + punto miles — español)
 *   "1234.56"    → 1234.56
 *   "1234,56"    → 1234.56
 *   ""           → 0
 *   null/undef   → 0
 *
 * Heurística: si contiene ambos separadores, el último es el decimal.
 * Si solo hay uno, se asume separador de miles si hay >3 dígitos después,
 * decimal si hay <=2 dígitos después (caso más común en contabilidad ES).
 */
export function parseAmount(v: unknown): number {
  if (v === null || v === undefined) return 0;
  if (typeof v === 'number') {
    return Number.isFinite(v) ? v : 0;
  }
  const raw = String(v).trim();
  if (raw === '' || raw === '-') return 0;

  // Detectar signo negativo (paréntesis o guión inicial)
  const isNegative = raw.startsWith('-') || (raw.startsWith('(') && raw.endsWith(')'));
  const cleaned = raw.replace(/^[-(]|\)$/g, '').trim();

  // Extraer solo dígitos y separadores
  const digits = cleaned.replace(/[^\d.,]/g, '');
  if (digits === '') return 0;

  const hasDot = digits.includes('.');
  const hasComma = digits.includes(',');

  let normalized: string;
  if (hasDot && hasComma) {
    // Ambos separadores presentes — el último es decimal.
    const lastDot = digits.lastIndexOf('.');
    const lastComma = digits.lastIndexOf(',');
    if (lastDot > lastComma) {
      // Formato inglés: "1,234.56"
      normalized = digits.replace(/,/g, '');
    } else {
      // Formato español: "1.234,56"
      normalized = digits.replace(/\./g, '').replace(',', '.');
    }
  } else if (hasComma) {
    // Solo coma — probablemente decimal español ("1234,56")
    // salvo que haya >3 dígitos tras la coma (miles: "1,234" → 1234)
    const afterComma = digits.substring(digits.lastIndexOf(',') + 1);
    if (afterComma.length > 2) {
      normalized = digits.replace(/,/g, '');
    } else {
      normalized = digits.replace(',', '.');
    }
  } else if (hasDot) {
    // Solo punto — igual heurística
    const afterDot = digits.substring(digits.lastIndexOf('.') + 1);
    if (afterDot.length > 2) {
      normalized = digits.replace(/\./g, '');
    } else {
      normalized = digits;
    }
  } else {
    normalized = digits;
  }

  const n = Number(normalized);
  if (!Number.isFinite(n)) return 0;
  return isNegative ? -n : n;
}

/**
 * Convierte fecha `DD/MM/YYYY` (formato del LM) a ISO `YYYY-MM-DD`.
 * Retorna `null` si el formato no coincide.
 */
export function parseSpanishDate(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s);
  if (!m) return null;
  const [, dd, mm, yyyy] = m;
  return `${yyyy}-${mm}-${dd}`;
}
