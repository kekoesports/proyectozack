/**
 * Bordes LED por marca en las cards de partners.
 *
 * Mecanismo:
 *  - `.gp-card-led` (pseudo-elemento ::before) pinta el aro exterior con
 *    un `linear-gradient` bajo máscara "gradient border via mask-composite".
 *  - Cada modificadora `.p-*` declara sus propios tokens
 *    (--brand-border, --brand-glow, --brand-accent, --brand-gradient).
 *  - Animación 5s ease-in-out infinite del `background-position`.
 *  - `@media (prefers-reduced-motion: reduce)` desactiva la animación.
 *
 * Además verifica:
 *  - KeyDrop y CSGO-SKINS ya no usan sus tokens antiguos (azul + rojo).
 *    Ahora KeyDrop es dorado y CSGO-SKINS cyan.
 *  - Las 4 BrandCard*.tsx llevan la clase `.gp-card-led`.
 *  - El layout raíz `/sorteos` carga `platform-brand-leds.css`.
 */

import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '..', '..', '..');
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf-8');

describe('[brand-leds] mecanismo compartido `.gp-card-led`', () => {
  const css = read('src/app/sorteos/plataforma/platform-brand-leds.css');

  it('define tokens fallback por si una marca no declara todos', () => {
    // Fallbacks van dentro de `:where(.gp-card-led)` — especificidad 0 —
    // para no pisar los tokens que cada `.p-<marca>` declara.
    expect(css).toMatch(/:where\(\.gp-card-led\)\s*\{[\s\S]{0,600}--brand-border:/);
    expect(css).toMatch(/:where\(\.gp-card-led\)\s*\{[\s\S]{0,600}--brand-glow:/);
    expect(css).toMatch(/:where\(\.gp-card-led\)\s*\{[\s\S]{0,600}--brand-accent:/);
    expect(css).toMatch(/:where\(\.gp-card-led\)\s*\{[\s\S]{0,800}--brand-gradient:/);
  });

  it('aplica los tokens a border-color + box-shadow (halo externo)', () => {
    // Estas reglas van en `.gp-card-led` sin `:where` — especificidad normal.
    expect(css).toMatch(/\.giveaway-platform \.gp-card-led\s*\{[\s\S]{0,400}border-color:\s*var\(--brand-border\)/);
    expect(css).toMatch(/\.giveaway-platform \.gp-card-led\s*\{[\s\S]{0,400}box-shadow:[\s\S]{0,200}var\(--brand-glow\)/);
  });

  it('borde LED con pseudo-elemento ::before + mask-composite exclude', () => {
    expect(css).toMatch(/\.gp-card-led::before\s*\{[\s\S]{0,500}background:\s*var\(--brand-gradient\)/);
    expect(css).toMatch(/\.gp-card-led::before\s*\{[\s\S]{0,800}mask-composite:\s*exclude/);
    expect(css).toMatch(/\.gp-card-led::before\s*\{[\s\S]{0,800}pointer-events:\s*none/);
  });

  it('animación 5s ease-in-out infinite del gradient (sutil, sin parpadeo)', () => {
    expect(css).toMatch(/animation:\s*gp-brand-led-shift\s+5s\s+ease-in-out\s+infinite/);
    expect(css).toMatch(/@keyframes\s+gp-brand-led-shift/);
  });

  it('respeta prefers-reduced-motion desactivando la animación', () => {
    expect(css).toMatch(/@media\s*\(prefers-reduced-motion:\s*reduce\)[\s\S]{0,400}animation:\s*none/);
    // Mantiene color estático (no desactiva el color).
    expect(css).toMatch(/@media\s*\(prefers-reduced-motion:\s*reduce\)[\s\S]{0,400}background-position:\s*50%\s+50%/);
  });
});

describe('[brand-leds] tokens por marca en platform-brand-cards.css', () => {
  const css = read('src/app/sorteos/plataforma/platform-brand-cards.css');

  it('KeyDrop tiene tokens dorados (ya no azules)', () => {
    // `.p-keydrop` declara los 4 tokens de marca.
    expect(css).toMatch(/\.p-keydrop\s*\{[\s\S]{0,900}--brand-border:\s*rgba\(245,\s*200,\s*75/);
    expect(css).toMatch(/\.p-keydrop\s*\{[\s\S]{0,900}--brand-accent:\s*#f5c84b/);
    expect(css).toMatch(/\.p-keydrop\s*\{[\s\S]{0,900}--brand-gradient:\s*linear-gradient/);
    // Ya NO usa el azul viejo `rgba(30, 155, 255, 0.35)`.
    expect(css).not.toMatch(/\.p-keydrop\s*\{[\s\S]{0,900}border-color:\s*rgba\(30,\s*155,\s*255/);
  });

  it('CSGO-SKINS (.p-red legacy) tiene tokens cyan (ya no rojos)', () => {
    expect(css).toMatch(/\.p-red\s*\{[\s\S]{0,900}--brand-border:\s*rgba\(40,\s*215,\s*255/);
    expect(css).toMatch(/\.p-red\s*\{[\s\S]{0,900}--brand-accent:\s*#28d7ff/);
    // Su glow interno también pasa a cyan.
    expect(css).toMatch(/\.p-red\s+\.glow\s*\{[\s\S]{0,400}rgba\(40,\s*215,\s*255/);
    // Ya no usa el rojo viejo.
    expect(css).not.toMatch(/\.p-red\s*\{[\s\S]{0,900}border-color:\s*rgba\(220,\s*38,\s*60/);
  });

  it('pill-offer y btn-red heredan cyan para casar con el border', () => {
    expect(css).toMatch(/\.pill-offer\.red\s*\{[\s\S]{0,200}rgba\(40,\s*215,\s*255/);
    expect(css).toMatch(/\.btn-red\s*\{[\s\S]{0,300}linear-gradient\([^)]*#0077ff[^)]*#28d7ff/);
  });

  it('SkinsMonkey/.p-gold conserva tokens dorados (misma familia visual)', () => {
    expect(css).toMatch(/\.p-gold\s*\{[\s\S]{0,900}--brand-accent:\s*#f5b73d/);
  });

  it('SkinClub tiene tokens purple/pink coherentes con el logo', () => {
    expect(css).toMatch(/\.p-skinclub\s*\{[\s\S]{0,900}--brand-accent:\s*#ff4bd8/);
    expect(css).toMatch(/\.p-skinclub\s*\{[\s\S]{0,900}--brand-gradient:\s*linear-gradient/);
  });
});

describe('[brand-leds] las 4 BrandCard*.tsx aplican `.gp-card-led`', () => {
  const files = [
    ['KeyDrop',      'BrandCardKeyDrop.tsx',      /p-keydrop/],
    ['CSGO-SKINS',   'BrandCardCsgoskins.tsx',    /p-red/],
    ['SkinsMonkey',  'BrandCardSkinsMonkey.tsx',  /p-monkey-v2/],
    ['Skin.Club',    'BrandCardSkinClub.tsx',     /p-skinclub/],
  ] as const;
  for (const [label, file, brandModifier] of files) {
    it(`${label}: className incluye \`gp-card-led\` + su modificadora`, () => {
      const src = read(`src/features/giveaway-platform/components/${file}`);
      expect(src).toMatch(/className="[^"]*\bgp-card-led\b[^"]*"/);
      expect(src).toMatch(brandModifier);
    });
  }
});

describe('[brand-leds] layout raíz carga el CSS', () => {
  const src = read('src/app/sorteos/layout.tsx');
  it("importa './plataforma/platform-brand-leds.css'", () => {
    expect(src).toMatch(/import\s+'\.\/plataforma\/platform-brand-leds\.css'/);
  });
});

describe('[brand-leds] contrato del CSS — sin regresiones bloqueantes', () => {
  const css = read('src/app/sorteos/plataforma/platform-brand-leds.css');

  it('el ::before no bloquea clicks (pointer-events: none)', () => {
    expect(css).toMatch(/\.gp-card-led::before\s*\{[\s\S]{0,600}pointer-events:\s*none/);
  });

  it('padding pequeño (~1.5px) para que el aro no coma el contenido', () => {
    expect(css).toMatch(/\.gp-card-led::before\s*\{[\s\S]{0,600}padding:\s*1\.5px/);
  });

  it('border-radius: inherit — el aro sigue las esquinas de la card', () => {
    expect(css).toMatch(/\.gp-card-led::before\s*\{[\s\S]{0,600}border-radius:\s*inherit/);
  });
});
