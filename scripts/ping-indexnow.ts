/**
 * Post-build hook: ping IndexNow con las URLs core del sitio.
 *
 * Ejecutado automáticamente al final de `npm run build` (ver package.json).
 * IndexNow ping es best-effort: NO rompe el build en ningún fallo — solo
 * loguea warning y termina con exit 0. Razones:
 *   1. Un fallo transitorio de IndexNow no debe bloquear un deploy.
 *   2. Previews y dev no deben empujar URLs a los buscadores.
 *   3. La ausencia de INDEXNOW_KEY (aún no configurada en el env) no debe
 *      convertirse en un incidente.
 *
 * Guard order:
 *   - VERCEL_ENV !== 'production'         → skip silencioso (previews/dev).
 *   - INDEXNOW_KEY missing                → warning + exit 0.
 *   - public/${INDEXNOW_KEY}.txt missing  → warning + exit 0.
 *   - public/${INDEXNOW_KEY}.txt content differs from env → warning + exit 0.
 *   - IndexNow HTTP != 2xx/202            → warning + exit 0.
 *
 * Fases 2-5 del sprint SEO+GEO 2026-07 enriquecerán URL_LIST con las
 * nuevas landings que se creen.
 */

import { readFileSync } from 'fs';
import { join } from 'path';

const HOST = 'socialpro.es';
const API_URL = 'https://api.indexnow.org/indexnow';

const URL_LIST = [
  'https://socialpro.es/',
  'https://socialpro.es/talentos',
  'https://socialpro.es/servicios',
  'https://socialpro.es/servicios/igaming',
  'https://socialpro.es/casos',
  'https://socialpro.es/nosotros',
  'https://socialpro.es/blog',
  'https://socialpro.es/news',
  'https://socialpro.es/keko',
  'https://socialpro.es/influencers-cs2',
  'https://socialpro.es/cs2-influencer-marketing',
  'https://socialpro.es/agencia-influencers-valorant',
  'https://socialpro.es/valorant-influencers-agency',
  'https://socialpro.es/agencia-marketing-esports',
  'https://socialpro.es/esports-marketing-agency',
  'https://socialpro.es/betting-influencers',
  'https://socialpro.es/twitch-streamers-agency',
  'https://socialpro.es/agencia-gaming-latam',
  'https://socialpro.es/apuesta-segura-cs2',
  'https://socialpro.es/guia-dgoj-igaming-influencers',
  // Fase 2 SEO+GEO 2026-07 — landings de ataque
  'https://socialpro.es/marketing-skins-cs2',
  'https://socialpro.es/agencia-streamers-kick',
  'https://socialpro.es/agencia-influencers-casino',
  'https://socialpro.es/streamers-apuestas-deportivas',
  'https://socialpro.es/influencers-poker',
  'https://socialpro.es/en',
];

async function main(): Promise<void> {
  const vercelEnv = process.env.VERCEL_ENV;
  if (vercelEnv && vercelEnv !== 'production') {
    // Preview/development builds no deben empujar a IndexNow.
    console.log(`[indexnow] skip — VERCEL_ENV=${vercelEnv} (only production pings)`);
    return;
  }

  const key = process.env.INDEXNOW_KEY;
  if (!key) {
    console.warn('[indexnow] warning: INDEXNOW_KEY env var missing — skipping ping. Add it in Vercel → Settings → Environment Variables.');
    return;
  }

  const keyFilePath = join(process.cwd(), 'public', `${key}.txt`);
  let publicFileContent: string;
  try {
    publicFileContent = readFileSync(keyFilePath, 'utf8').trim();
  } catch {
    console.warn(`[indexnow] warning: key file not found at public/${key}.txt — skipping ping. IndexNow would reject verification.`);
    return;
  }
  if (publicFileContent !== key) {
    console.warn(`[indexnow] warning: public/${key}.txt content differs from INDEXNOW_KEY env — skipping ping. Rotate both to the same value.`);
    return;
  }

  const body = {
    host: HOST,
    key,
    keyLocation: `https://${HOST}/${key}.txt`,
    urlList: URL_LIST,
  };

  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    // IndexNow returns 200 OK, 202 Accepted (processed async), or 4xx/5xx on error.
    if (res.status === 200 || res.status === 202) {
      console.log(`[indexnow] ok (HTTP ${res.status}) — ${URL_LIST.length} URLs submitted`);
    } else {
      console.warn(`[indexnow] warning: HTTP ${res.status} — not failing the build`);
    }
  } catch (err) {
    console.warn('[indexnow] warning: ping failed —', err instanceof Error ? err.message : err);
  }
}

// Never fail the build over a background SEO ping.
main().catch((err) => {
  console.warn('[indexnow] warning: unexpected error —', err instanceof Error ? err.message : err);
});
