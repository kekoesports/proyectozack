/**
 * Regla 2026-07-10: la home de misiones muestra **10 cards visibles en
 * total**, contando las de redes (Discord, Twitch, YouTube — reales o
 * placeholders), que siempre van primero. Las internas rellenan hasta
 * completar 10; el resto entra en el botón "Ver más".
 *
 * Tests estructurales sobre el fuente porque `MissionsGrid` importa
 * `DiscordMissionCard` → `auth` → `better-auth` (ESM que jest no compila
 * sin config extra). El patrón (grep sobre el fuente) es el mismo que
 * usamos para verificar el `FOR UPDATE` de conciliación bancaria.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const SOURCE = readFileSync(
  resolve(process.cwd(), 'src/features/giveaway-platform/components/MissionsGrid.tsx'),
  'utf8',
);

describe('MissionsGrid — regla "10 cards visibles en total"', () => {
  it('define TOTAL_VISIBLE = 10 (regresión: antes era FEATURED_COUNT = 4)', () => {
    expect(SOURCE).toMatch(/const\s+TOTAL_VISIBLE\s*=\s*10\b/);
    // El nombre y valor antiguos ya no deben aparecer.
    expect(SOURCE).not.toMatch(/const\s+FEATURED_COUNT\s*=\s*4\b/);
  });

  it('el featuredCount se calcula restando las cards sociales de TOTAL_VISIBLE', () => {
    // Buscamos la expresión `TOTAL_VISIBLE - socialCardCount` con
    // espaciado tolerante.
    expect(SOURCE).toMatch(/TOTAL_VISIBLE\s*-\s*socialCardCount/);
  });

  it('socialCardCount contabiliza Discord, Twitch (reales o placeholders) y YouTube fijo', () => {
    // Debe contar el número real de cards Discord + Twitch cuando hay,
    // 1 cuando son placeholder, y sumar 1 fijo por YouTube.
    expect(SOURCE).toMatch(/hasDiscordCard\s*\?\s*discordMissions\.length\s*:\s*hasDiscordPlaceholder\s*\?\s*1\s*:\s*0/);
    expect(SOURCE).toMatch(/hasTwitchCard\s*\?\s*twitchMissions\.length\s*:\s*hasTwitchPlaceholder\s*\?\s*1\s*:\s*0/);
    // YouTube: la line con `+ 1` (comentario o expresión) tras el bloque
    // Discord/Twitch. Comprobamos que aparece un `+ 1` en la suma.
    const socialIdx = SOURCE.indexOf('socialCardCount');
    const featuredIdx = SOURCE.indexOf('const featuredCount');
    expect(featuredIdx).toBeGreaterThan(socialIdx);
    const between = SOURCE.slice(socialIdx, featuredIdx);
    expect(between).toMatch(/\+\s*1/);
  });

  it('featuredCount aplica Math.max(0, …) para no ser negativo si sociales > 10', () => {
    expect(SOURCE).toMatch(/Math\.max\(\s*0\s*,\s*TOTAL_VISIBLE\s*-\s*socialCardCount\s*\)/);
  });

  it('featured y rest usan featuredCount (no un literal 4)', () => {
    expect(SOURCE).toMatch(/sortedOther\.slice\(\s*0\s*,\s*featuredCount\s*\)/);
    expect(SOURCE).toMatch(/sortedOther\.slice\(\s*featuredCount\s*\)/);
  });
});
