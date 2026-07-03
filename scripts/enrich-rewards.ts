/**
 * Enriquecimiento manual de metadata de Steam Market — dev-only.
 *
 * ============================================================
 * NUNCA se ejecuta en CI/producción. Es una herramienta local
 * para que el owner obtenga metadata real de Steam antes de
 * commitear el catálogo. Bloqueada si detecta entorno CI/prod.
 * ============================================================
 *
 * Qué hace:
 *  1. Lee `REAL_STEAM_REWARDS` de `rewards-catalog.ts`.
 *  2. Para cada URL de Steam Market:
 *     - Rate-limited a 1 req cada 3s (Steam bloquea agresivamente).
 *     - Fetch de la página HTML.
 *     - Extrae la primera URL `community.steamstatic.com/economy/image/`
 *       (= imagen hero del item).
 *     - Reporta: nombre, hash de imagen, sugerencia de path local.
 *  3. Salida en JSON (`.scratch/steam-enrich-{date}.json`) para revisión.
 *  4. NO descarga imágenes — eso es una decisión aparte del owner.
 *  5. NO modifica DB. NO modifica `rewards-catalog.ts` automáticamente.
 *
 * Uso:
 *   npx tsx scripts/enrich-rewards.ts
 *
 * Precondiciones:
 *   - Correr desde local (no CI). El script aborta si detecta CI.
 *   - Steam puede devolver 429 o 403 en IPs con alta actividad. Reintento
 *     exponencial (3 intentos, backoff 3s/9s/27s).
 *
 * Salida esperada (ejemplo):
 *   [1/8] AWP | Atheris (Field-Tested)
 *         ok → hash=i0CoZ...
 *         suggested local path: public/images/rewards/awp-atheris-ft.png
 *   ...
 *
 * Tras la ejecución el owner revisa el JSON y decide:
 *   - Descargar las imágenes manualmente con curl (comando en el output).
 *   - Actualizar `REAL_STEAM_REWARDS` con precios finales si desea.
 *   - Ejecutar `scripts/seed-socialpro-rewards-steam.ts` si procede.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { REAL_STEAM_REWARDS } from '../src/features/giveaway-platform/constants/rewards-catalog';

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64) AppleWebKit/537.36';
const RATE_LIMIT_MS = 3_000;
const MAX_RETRIES = 3;
const OUTPUT_DIR = '.scratch';

interface EnrichResult {
  slug: string;
  name: string;
  wear: string | null;
  steamMarketUrl: string;
  ok: boolean;
  imageHash: string | null;
  imageUrl: string | null;
  suggestedLocalPath: string;
  errorMsg?: string;
  retries: number;
}

function detectCiOrProd(): boolean {
  return (
    process.env.CI === 'true' ||
    process.env.NODE_ENV === 'production' ||
    process.env.VERCEL === '1' ||
    Boolean(process.env.GITHUB_ACTIONS)
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchWithBackoff(url: string): Promise<{ html: string; retries: number } | { error: string; retries: number }> {
  let backoff = RATE_LIMIT_MS;
  let retries = 0;
  while (retries < MAX_RETRIES) {
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': USER_AGENT,
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9',
        },
      });
      if (res.status === 429 || res.status === 403) {
        await sleep(backoff * 3);
        backoff *= 3;
        retries++;
        continue;
      }
      if (!res.ok) {
        return { error: `HTTP ${res.status}`, retries };
      }
      const html = await res.text();
      return { html, retries };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await sleep(backoff);
      backoff *= 2;
      retries++;
      if (retries >= MAX_RETRIES) return { error: msg, retries };
    }
  }
  return { error: 'max retries exceeded', retries };
}

function extractFirstEconomyImage(html: string): string | null {
  const m = html.match(/community\.steamstatic\.com\/economy\/image\/([A-Za-z0-9_-]+)/);
  return m ? m[1] : null;
}

async function main() {
  if (detectCiOrProd()) {
    console.error(
      'Enrichment abortado: detectado entorno CI/producción.\n' +
      'Este script es dev-only. Ejecutar solo en local.',
    );
    process.exit(1);
  }

  const targets = REAL_STEAM_REWARDS.filter((r) => r.steamMarketUrl && r.steamMarketUrl.length > 0);
  if (targets.length === 0) {
    console.log('No hay URLs de Steam Market en el catálogo. Nada que enriquecer.');
    return;
  }

  console.log(`Enriqueciendo ${targets.length} URLs — rate limit ${RATE_LIMIT_MS}ms · retries ${MAX_RETRIES}.\n`);
  const results: EnrichResult[] = [];

  for (const [i, reward] of targets.entries()) {
    console.log(`[${i + 1}/${targets.length}] ${reward.name}${reward.wear ? ` (${reward.wear})` : ''}`);
    const r = await fetchWithBackoff(reward.steamMarketUrl);
    const suggestedLocalPath = `public/images/rewards/${reward.slug}.png`;

    if ('error' in r) {
      console.log(`      ✗ fetch fallido (retries=${r.retries}): ${r.error}`);
      results.push({
        slug: reward.slug,
        name: reward.name,
        wear: reward.wear,
        steamMarketUrl: reward.steamMarketUrl,
        ok: false,
        imageHash: null,
        imageUrl: null,
        suggestedLocalPath,
        errorMsg: r.error,
        retries: r.retries,
      });
    } else {
      const hash = extractFirstEconomyImage(r.html);
      if (!hash) {
        console.log(`      ✗ no se encontró imagen hero en el HTML`);
        results.push({
          slug: reward.slug,
          name: reward.name,
          wear: reward.wear,
          steamMarketUrl: reward.steamMarketUrl,
          ok: false,
          imageHash: null,
          imageUrl: null,
          suggestedLocalPath,
          errorMsg: 'no economy image found',
          retries: r.retries,
        });
      } else {
        const imageUrl = `https://community.steamstatic.com/economy/image/${hash}/360fx360f`;
        console.log(`      ok → hash=${hash.slice(0, 40)}...`);
        console.log(`      suggested local path: ${suggestedLocalPath}`);
        results.push({
          slug: reward.slug,
          name: reward.name,
          wear: reward.wear,
          steamMarketUrl: reward.steamMarketUrl,
          ok: true,
          imageHash: hash,
          imageUrl,
          suggestedLocalPath,
          retries: r.retries,
        });
      }
    }

    // Rate limit incluso en la última — no molesta al usuario y mantiene el
    // patrón por si añaden URLs en el catálogo.
    if (i < targets.length - 1) {
      await sleep(RATE_LIMIT_MS);
    }
  }

  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const now = new Date().toISOString().replace(/[:.]/g, '-');
  const outFile = path.join(OUTPUT_DIR, `steam-enrich-${now}.json`);
  fs.writeFileSync(outFile, JSON.stringify(results, null, 2));
  console.log(`\n✓ Resultado en ${outFile}`);
  console.log(`  ${results.filter((r) => r.ok).length}/${results.length} URLs enriquecidas.`);
  console.log('\nSiguientes pasos:');
  console.log('  1. Revisar el JSON — descartar entradas ok:false.');
  console.log('  2. Descargar imágenes manualmente si procede:');
  console.log('     curl -sSL -A "Mozilla/5.0" "<imageUrl>" -o "<suggestedLocalPath>"');
  console.log('  3. NO modificar rewards-catalog.ts sin revisión.');
}

main().catch((err) => {
  console.error('enrich fallido:', err);
  process.exit(1);
});
