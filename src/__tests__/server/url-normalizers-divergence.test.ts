/**
 * Los dos normalizadores de URL no coinciden, y este test lo deja por escrito.
 *
 * Hay dos caminos que escriben `deal_deliverable_items.normalized_url`:
 *
 *   · sync de Sheets  → `normalizeUrl`        (campaign-sheet-aggregation.ts)
 *   · import manual   → `normalizeContentUrl` (utils/url-normalizer.ts)
 *
 * Producen claves distintas para la misma URL: uno conserva el `www.` y el otro
 * no, y solo `normalizeContentUrl` canonicaliza `youtu.be` a `youtube.com`.
 *
 * **Por qué importa:** el índice único `(tracker_id, normalized_url)` de la
 * migración 0120 impide duplicados *dentro* de un camino, pero no *entre*
 * caminos: la misma URL entrada por Sheets y por importación manual genera dos
 * claves y el índice no ve nada raro. Si ambas quedan `valid`, el progreso del
 * trato cuenta el mismo contenido dos veces.
 *
 * **Impacto real medido en producción el 2026-08-20:** 607 filas activas, 607
 * claves canónicas, **0 colisiones**. En la práctica cada tracker usa un solo
 * camino, así que hoy es un riesgo latente y no un fallo. Por eso se fija con
 * un test en lugar de unificarlos: unificar obliga a recalcular la clave de
 * todas las filas y a deduplicar otra vez, y eso no se hace sin necesidad.
 *
 * Si alguien los unifica, este test fallará. Es lo que se busca: que el cambio
 * sea deliberado y que aquí quede constancia de qué se decidió.
 */

import { normalizeUrl } from '@/lib/queries/campaign-sheet-aggregation';
import { normalizeContentUrl } from '@/lib/utils/url-normalizer';

/** Casos reales del corpus de evidencias. */
const CASOS = [
  'https://www.youtube.com/watch?v=PexNm7clH5g',
  'https://youtu.be/PexNm7clH5g?si=I6F01xc9Um_R2UgS',
  'https://www.twitch.tv/videos/2345678901',
  'https://www.youtube.com/watch?v=abc123&t=42',
  'https://www.instagram.com/p/CxYz123/',
  'https://www.youtube.com/shorts/xyz789',
] as const;

describe('normalizeUrl vs normalizeContentUrl — divergencia conocida', () => {
  it.each(CASOS)('%s produce claves distintas en cada camino', (url) => {
    const porSheets = normalizeUrl(url);
    const porImport = normalizeContentUrl(url).normalizedUrl;
    expect(porSheets).not.toBeNull();
    expect(porImport).not.toBeNull();
    // Si esto empieza a fallar es que alguien los ha unificado. Ver la cabecera:
    // hay que recalcular normalized_url de las filas existentes antes.
    expect(porSheets).not.toBe(porImport);
  });

  it('solo el camino de importación quita el www.', () => {
    expect(normalizeUrl('https://www.twitch.tv/videos/1')).toContain('www.');
    expect(normalizeContentUrl('https://www.twitch.tv/videos/1').normalizedUrl).not.toContain('www.');
  });

  it('solo el camino de importación canonicaliza youtu.be', () => {
    const corto = 'https://youtu.be/PexNm7clH5g';
    const largo = 'https://www.youtube.com/watch?v=PexNm7clH5g';
    // Para la importación, ambas formas son el mismo vídeo.
    expect(normalizeContentUrl(corto).normalizedUrl)
      .toBe(normalizeContentUrl(largo).normalizedUrl);
    // Para el sync de Sheets, son dos evidencias distintas.
    expect(normalizeUrl(corto)).not.toBe(normalizeUrl(largo));
  });

  it('ambos coinciden cuando la URL ya está en forma canónica', () => {
    // Sin www., sin barra final y sin parámetros que limpiar no hay discrepancia.
    const limpia = 'https://kick.com/zacketizor';
    expect(normalizeUrl(limpia)).toBe(normalizeContentUrl(limpia).normalizedUrl);
  });
});
