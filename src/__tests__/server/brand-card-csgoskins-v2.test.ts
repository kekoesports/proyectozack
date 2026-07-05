/**
 * Card CSGO-SKINS v2 — patrón compacto con banner lateral + countdown live.
 *
 * Motivación: el partner CSGO-SKINS tiene un evento promocional activo
 * (Dust II Roadtrip). En vez de mostrar el agente flotante genérico
 * anterior, la card ahora usa el banner del evento como visual lateral
 * y muestra un countdown live sincronizado a la fecha de fin.
 *
 * Contratos verificados:
 *  - Card usa `.p-csgo-v2` (además de `.p-red` para los tokens LED cyan).
 *  - Banner del evento referenciado en `brands.ts` → `csgoskins-roadtrip.png`.
 *  - Component monta `<CsgoskinsRoadtripCountdown>` con prop `endsAt`.
 *  - Countdown es SSR-safe (usa useEffect + setInterval, no bloquea).
 *  - Al finalizar, muestra "Evento finalizado" (no NaN ni negativos).
 *  - CSS `.p-csgo-v2` extraído a archivo dedicado (budget de LOC).
 *  - Layout raíz carga `platform-brand-csgo.css`.
 *  - Copy propio ("Encuentra la caja oculta en la campaña del partner").
 */

import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '..', '..', '..');
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf-8');

describe('[csgoskins-v2] componente card', () => {
  const src = read('src/features/giveaway-platform/components/BrandCardCsgoskins.tsx');

  it('usa .p-csgo-v2 junto a las clases base y .p-red (tokens cyan)', () => {
    expect(src).toMatch(/className="[^"]*\bgp-card\b[^"]*"/);
    expect(src).toMatch(/className="[^"]*\bgp-card-led\b[^"]*"/);
    expect(src).toMatch(/className="[^"]*\bp-red\b[^"]*"/);
    expect(src).toMatch(/className="[^"]*\bp-csgo-v2\b[^"]*"/);
  });

  it('monta banner del evento como <Image fill> en `.gp-csgo-media`', () => {
    expect(src).toMatch(/<div className="gp-csgo-media"\s+aria-hidden>/);
    expect(src).toMatch(/<Image[\s\S]{0,200}fill[\s\S]{0,200}gp-csgo-media-img/);
    expect(src).toMatch(/sizes="\(max-width:\s*720px\)\s*100vw,\s*460px"/);
  });

  it('renderiza countdown live con endsAt configurable (constante bien identificada)', () => {
    expect(src).toMatch(/const\s+CSGOSKINS_EVENT_ENDS_AT\s*=\s*'2026-07-26T22:18:00\+02:00'/);
    expect(src).toMatch(/<CsgoskinsRoadtripCountdown\s+endsAt=\{CSGOSKINS_EVENT_ENDS_AT\}\s*\/>/);
  });

  it('copy propio del evento + CTA + código promocional', () => {
    expect(src).toMatch(/gp-csgo-event-tag[\s\S]{0,80}Evento activo/);
    expect(src).toMatch(/gp-csgo-event-title[\s\S]{0,80}DUST II ROADTRIP/);
    expect(src).toMatch(/Encuentra la caja oculta/);
    expect(src).toMatch(/Ir a CSGO-SKINS/);
    // Código dinámico desde props, no hardcodeado.
    expect(src).toMatch(/con el código <span>\{code\}<\/span>/);
  });
});

describe('[csgoskins-v2] componente countdown', () => {
  const src = read('src/features/giveaway-platform/components/CsgoskinsRoadtripCountdown.tsx');

  it("es 'use client' con endsAt como prop obligatoria", () => {
    expect(src).toMatch(/^'use client';/);
    expect(src).toMatch(/endsAt:\s*string/);
  });

  it('actualiza cada segundo con setInterval y limpia en unmount', () => {
    // Arrow multilínea → aceptamos cualquier cuerpo hasta el ", 1000".
    expect(src).toMatch(/window\.setInterval\([\s\S]{0,300},\s*1000\)/);
    expect(src).toMatch(/return\s*\(\)\s*=>\s*window\.clearInterval\(id\)/);
  });

  it('compute() devuelve remaining con días/horas/minutos/segundos y flag finished', () => {
    expect(src).toMatch(/function compute\(/);
    expect(src).toMatch(/finished:\s*(true|false)/);
    // Nunca devuelve valores negativos (Math.max(0, ...)).
    expect(src).toMatch(/Math\.max\(0,\s*endsAtMs\s*-\s*now\)/);
  });

  it('al finalizar muestra "Evento finalizado" con role aria-live', () => {
    expect(src).toMatch(/aria-live="polite"[\s\S]{0,120}Evento finalizado/);
  });

  it('padding con ceros: 08:18:57 no 8:18:57', () => {
    expect(src).toMatch(/padStart\(2,\s*'0'\)/);
  });

  it('previene hydration mismatch con suppressHydrationWarning en el time', () => {
    expect(src).toMatch(/suppressHydrationWarning/);
  });
});

describe('[csgoskins-v2] CSS extraído a archivo dedicado', () => {
  it('platform-brand-csgo.css define .p-csgo-v2 con media lateral', () => {
    const css = read('src/app/sorteos/plataforma/platform-brand-csgo.css');
    expect(css).toMatch(/\.p-csgo-v2\s*\{[\s\S]{0,300}position:\s*relative/);
    expect(css).toMatch(/\.p-csgo-v2\s+\.gp-csgo-media\s*\{[\s\S]{0,400}position:\s*absolute/);
    expect(css).toMatch(/\.p-csgo-v2\s+\.gp-csgo-media\s*\{[\s\S]{0,400}mask-image:\s*linear-gradient\(90deg/);
  });

  it('media-img cubre con object-fit cover + object-position center', () => {
    const css = read('src/app/sorteos/plataforma/platform-brand-csgo.css');
    expect(css).toMatch(/\.gp-csgo-media-img\s*\{[\s\S]{0,200}object-fit:\s*cover/);
  });

  it('countdown en tonos cyan + tabular-nums', () => {
    const css = read('src/app/sorteos/plataforma/platform-brand-csgo.css');
    expect(css).toMatch(/\.gp-csgo-countdown\s*\{[\s\S]{0,400}rgba\(40,\s*215,\s*255/);
    expect(css).toMatch(/\.gp-csgo-countdown-time\s*\{[\s\S]{0,300}tabular-nums/);
  });

  it('mobile ≤480px reordena el banner arriba con máscara vertical', () => {
    const css = read('src/app/sorteos/plataforma/platform-brand-csgo.css');
    expect(css).toMatch(/@media\s*\(max-width:\s*480px\)[\s\S]{0,800}\.gp-csgo-media\s*\{[\s\S]{0,400}mask-image:\s*linear-gradient\(180deg/);
  });

  it('layout raíz /sorteos carga el CSS nuevo', () => {
    const src = read('src/app/sorteos/layout.tsx');
    expect(src).toMatch(/import\s+'\.\/plataforma\/platform-brand-csgo\.css'/);
  });
});

describe('[csgoskins-v2] asset del banner referenciado en brands.ts', () => {
  const src = read('src/features/giveaway-platform/constants/brands.ts');

  it('agentAsset apunta a csgoskins-roadtrip.png', () => {
    expect(src).toMatch(/csgoskins:[\s\S]{0,500}agentAsset:\s*'\/images\/brands\/csgoskins-roadtrip\.png'/);
  });

  it('el asset PNG existe en public/images/brands/', () => {
    const p = path.join(ROOT, 'public/images/brands/csgoskins-roadtrip.png');
    expect(fs.existsSync(p)).toBe(true);
    // Tamaño > 100KB (banner con arte, no placeholder vacío).
    expect(fs.statSync(p).size).toBeGreaterThan(100_000);
  });
});
