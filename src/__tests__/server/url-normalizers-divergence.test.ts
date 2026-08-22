/**
 * Regression lock: Sheets e importación manual comparten normalizador.
 *
 * La divergencia histórica se cerró en 89083443. Volver a separar estos dos
 * caminos permitiría que la misma evidencia contara dos veces bajo claves
 * distintas, pese al índice único por tracker.
 */

import { normalizeUrl } from '@/lib/queries/campaign-sheet-aggregation';
import { normalizeContentUrl } from '@/lib/utils/url-normalizer';

const CASES = [
  'https://www.youtube.com/watch?v=PexNm7clH5g',
  'https://youtu.be/PexNm7clH5g?si=I6F01xc9Um_R2UgS',
  'https://www.twitch.tv/videos/2345678901',
  'https://www.youtube.com/watch?v=abc123&t=42',
  'https://www.instagram.com/p/CxYz123/',
  'https://www.youtube.com/shorts/xyz789',
] as const;

describe('normalizeUrl vs normalizeContentUrl — normalizador único', () => {
  it.each(CASES)('%s produce la misma clave en ambos caminos', (url) => {
    const porSheets = normalizeUrl(url);
    const porImport = normalizeContentUrl(url).normalizedUrl;
    expect(porSheets).not.toBeNull();
    expect(porSheets).toBe(porImport);
  });

  it('quita www. en ambos caminos', () => {
    expect(normalizeUrl('https://www.twitch.tv/videos/1')).not.toContain('www.');
    expect(normalizeContentUrl('https://www.twitch.tv/videos/1').normalizedUrl).not.toContain('www.');
  });

  it('canonicaliza youtu.be y youtube.com al mismo vídeo', () => {
    const corto = 'https://youtu.be/PexNm7clH5g';
    const largo = 'https://www.youtube.com/watch?v=PexNm7clH5g';
    expect(normalizeUrl(corto)).toBe(normalizeUrl(largo));
    expect(normalizeContentUrl(corto).normalizedUrl)
      .toBe(normalizeContentUrl(largo).normalizedUrl);
  });

  it('extrae una URL embebida antes de canonicalizarla', () => {
    expect(normalizeUrl('Vídeo: https://www.twitch.tv/videos/123?t=10')).toBe(
      'https://twitch.tv/videos/123',
    );
  });
});
