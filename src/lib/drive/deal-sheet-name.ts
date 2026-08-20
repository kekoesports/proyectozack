/**
 * Nombre canónico de la hoja de seguimiento de un trato: `MARCA - CREADOR`.
 *
 * En Drive conviven tres formas heredadas (`MARCA - CREADOR`, `MARCA x CREADOR`
 * y `CREADOR x MARCA`). Las hojas nuevas usan siempre la primera, que es la
 * dominante en KEYDROP y PIRATESWAP —las carpetas más activas—, para no añadir
 * una cuarta variante que el emparejador tenga que aprender.
 *
 * Vive aparte del cliente de Drive a propósito: es una función pura y así se
 * puede probar sin arrastrar `env` ni la capa HTTP.
 */
export function buildDealSheetName(brandName: string, talentName: string): string {
  const limpia = (value: string): string => value.trim().replace(/\s+/g, ' ');
  return `${limpia(brandName)} - ${limpia(talentName)}`;
}
