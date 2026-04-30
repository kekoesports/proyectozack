/**
 * Mapa de imágenes de banderas redondas por código ISO-2.
 * Para añadir más: añade la entrada aquí con el código en mayúsculas.
 * Si un país no está aquí, el sistema usa el emoji de bandera como fallback.
 */
export const FLAG_IMAGES: Record<string, string> = {
  ES: 'https://static.vecteezy.com/system/resources/thumbnails/051/802/716/small/spain-country-round-flag-free-png.png',
  AR: 'https://images.icon-icons.com/3665/PNG/512/argentina_flag_icon_228621.png',
  CL: 'https://static.vecteezy.com/system/resources/previews/045/356/697/non_2x/round-flag-of-chile-free-png.png',
};

/** Devuelve la URL de la bandera redonda o null si no existe. */
export function getFlagImageUrl(countryCode: string): string | null {
  if (!countryCode) return null;
  return FLAG_IMAGES[countryCode.toUpperCase()] ?? null;
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
