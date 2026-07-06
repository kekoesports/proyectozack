/**
 * Contratos estructurales de los follow-ups post-QA PR #170:
 *  - HistoricalWinnersPlaceholder (banner mini honesto, no ganadores inventados).
 *  - MonthlyRanking empty state: mini banner en lugar de línea suelta.
 *  - SteamAvatar con fallback premium (iniciales + gradient, nunca broken img).
 *  - remotePatterns incluye Steam CDN (defensivo, next/image-ready).
 *  - Doc de diagnóstico del endpoint singular KeyDrop existe.
 */

import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '..', '..', '..');
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf-8');

describe('[post-170] HistoricalWinnersPlaceholder', () => {
  const src = read('src/features/giveaway-platform/components/HistoricalWinnersPlaceholder.tsx');

  it('render banner mini con aria-live=off (no interrumpe SR)', () => {
    expect(src).toMatch(/<aside[\s\S]{0,120}aria-live="off"/);
    expect(src).toMatch(/gp-hist-winners-mini/);
  });

  it('copy honesto sin inventar ganadores', () => {
    expect(src).toMatch(/Histórico de ganadores próximamente/);
    expect(src).toMatch(/primer ranking mensual/);
    expect(src).not.toMatch(/ganador\s*(?:1|2|3|:)/i); // no listas fake
  });

  it('está integrado dentro de #recompensas en la landing por creador', () => {
    // Post rewards-hub refactor: el placeholder de winners históricos vive
    // dentro del bloque #recompensas (bajo el hub de tabs). Ver
    // src/features/giveaway-platform/components/RewardsHub.tsx.
    const src = read('src/features/giveaway-platform/components/PlatformCreatorLanding.tsx');
    expect(src).toMatch(/import\s*\{\s*HistoricalWinnersPlaceholder\s*\}/);
    expect(src).toMatch(/<RewardsHub[\s\S]{0,600}<HistoricalWinnersPlaceholder\s*\/>/);
  });
});

describe('[post-170] MonthlyRanking empty state mini', () => {
  const src = read('src/features/giveaway-platform/components/MonthlyRanking.tsx');

  it('empty state es un aside mini, no un párrafo suelto', () => {
    expect(src).toMatch(/rows\.length\s*===\s*0[\s\S]{0,400}<aside[\s\S]{0,80}gp-rank-empty-mini/);
    expect(src).toMatch(/Ranking mensual próximamente/);
  });

  it('copy aclara que la fuente son participaciones internas SocialPro', () => {
    expect(src).toMatch(/participaciones internas/);
  });

  it('CSS del empty mini existe (dashed border sp-pink) en platform-mini-placeholders.css', () => {
    const css = read('src/app/sorteos/plataforma/platform-mini-placeholders.css');
    expect(css).toMatch(/\.gp-rank-empty-mini\s*\{[\s\S]{0,400}border:\s*1px\s+dashed/);
  });
});

describe('[post-170] SteamAvatar fallback premium', () => {
  const src = read('src/features/giveaway-platform/components/SteamAvatar.tsx');

  it("es 'use client' (usa useState para onError)", () => {
    expect(src).toMatch(/^'use client';/);
    expect(src).toMatch(/useState/);
  });

  it('si imageUrl null/failed → renderiza iniciales, nunca <img> roto', () => {
    expect(src).toMatch(/const\s+show\s*=\s*imageUrl\s*&&\s*!failed/);
    expect(src).toMatch(/onError=\{\(\)\s*=>\s*setFailed\(true\)\}/);
    expect(src).toMatch(/gp-steam-avatar-fallback/);
    expect(src).toMatch(/initialsFrom/);
  });

  it('img usa referrerPolicy no-referrer (Steam CDN a veces bloquea con referer)', () => {
    expect(src).toMatch(/referrerPolicy="no-referrer"/);
  });

  it('helper initialsFrom devuelve "·" cuando no hay nombre', () => {
    expect(src).toMatch(/if\s*\(!name\)\s*return\s*'·'/);
  });

  it('CSS del fallback con gradient SP (orange → pink → purple) en platform-steam-avatar.css', () => {
    const css = read('src/app/sorteos/plataforma/platform-steam-avatar.css');
    expect(css).toMatch(/\.gp-steam-avatar-fallback\s*\{[\s\S]{0,500}linear-gradient\([\s\S]{0,120}var\(--sp-orange\)[\s\S]{0,120}var\(--sp-pink\)[\s\S]{0,120}var\(--sp-purple\)/);
  });

  it('layout raíz de /sorteos carga los CSS de la plataforma', () => {
    const layout = read('src/app/sorteos/layout.tsx');
    expect(layout).toMatch(/import\s+'\.\/plataforma\/platform-steam-avatar\.css'/);
    expect(layout).toMatch(/import\s+'\.\/plataforma\/platform-mini-placeholders\.css'/);
  });

  it('UserPill usa SteamAvatar (elimina el emoji 🐱/🎮 hardcodeado del avatar)', () => {
    const pill = read('src/features/giveaway-platform/components/UserPill.tsx');
    expect(pill).toMatch(/<SteamAvatar\s+imageUrl=\{userImage\}\s+name=\{userName\}\s+size=\{26\}/);
    // El avatar antiguo era `<span className="gp-avatar" aria-hidden>🐱|🎮</span>`.
    // Comprobamos que ese patrón concreto ya no existe (el emoji 🎮 del botón de
    // login y el ⭐ de los puntos son legítimos y siguen).
    expect(pill).not.toMatch(/<span\s+className="gp-avatar"[^>]*>\s*(🐱|🎮)/);
  });

  it('/perfil usa SteamAvatar en el hero', () => {
    const perfil = read('src/app/sorteos/perfil/page.tsx');
    expect(perfil).toMatch(/<SteamAvatar\s+imageUrl=\{userImage\}\s+name=\{userName\}\s+size=\{84\}/);
  });
});

describe('[post-170] remotePatterns incluye Steam CDN', () => {
  const src = read('next.config.ts');
  it('avatars.steamstatic.com y wildcard *.steamstatic.com', () => {
    expect(src).toMatch(/hostname:\s*'avatars\.steamstatic\.com'/);
    expect(src).toMatch(/hostname:\s*'\*\.steamstatic\.com'/);
  });
  it('akamai variant (edge geo)', () => {
    expect(src).toMatch(/hostname:\s*'avatars\.akamai\.steamstatic\.com'/);
  });
});

describe('[post-170] doc diagnóstico endpoint singular KeyDrop', () => {
  const src = read('docs/keydrop-single-giveaway-endpoint.md');
  it('registra que el endpoint responde 401 sin key', () => {
    expect(src).toMatch(/401\s+Unauthorized/);
    expect(src).toMatch(/Invalid api key/);
  });
  it('registra que la key vive solo en Vercel Production', () => {
    expect(src).toMatch(/solo en Vercel Production/);
  });
  it('registra la política de no imprimir la key en logs', () => {
    expect(src).toMatch(/No he impreso ni pedido la key/);
  });
});
