/**
 * Devuelve la URL de la bandera PNG desde flagcdn.com para cualquier código ISO-2.
 * Cubre todos los países sin mapa manual. Funciona en Windows + Chrome donde los
 * flag emoji Unicode no renderizan.
 */
export function getFlagImageUrl(countryCode: string): string | null {
  if (!countryCode) return null;
  const code = countryCode.trim().toLowerCase();
  if (!/^[a-z]{2}$/.test(code)) return null;
  return `https://flagcdn.com/w20/${code}.png`;
}

/** Fallback: genera emoji desde código ISO-2. */
export function countryFlagEmoji(code: string): string {
  if (!code || code.trim().length !== 2) return '';
  const c = code.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(c)) return c;
  const OFFSET = 0x1F1E6 - 0x41;
  try {
    return (
      String.fromCodePoint(c.charCodeAt(0) + OFFSET) +
      String.fromCodePoint(c.charCodeAt(1) + OFFSET)
    );
  } catch { return c; }
}
