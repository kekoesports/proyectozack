/**
 * Contratos estructurales del responsive mobile de /sorteos (PR-A).
 *
 * Verifica sin renderizar navegador — solo lecturas de los CSS:
 *  - `platform-mobile-responsive.css` existe y se importa desde layout.
 *  - Los breakpoints 640/480/390 están presentes.
 *  - Las reglas críticas están cubiertas (nav scrollable, dropdown fit,
 *    UserPill tap target, Shop tabs cómodas, Profile stats 1 col, etc.).
 *  - El bloque `@media (max-width: 980px)` de `platform.css` YA no oculta
 *    los tabs de nav — ahora los hace scrollables.
 *  - Reglas anti-overflow presentes.
 */

import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '..', '..', '..');
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf-8');

const MOBILE_CSS = 'src/app/sorteos/plataforma/platform-mobile-responsive.css';
const PLATFORM_CSS = 'src/app/sorteos/plataforma/platform.css';
const LAYOUT = 'src/app/sorteos/layout.tsx';

describe('[mobile-responsive] wiring: archivo nuevo cargado desde layout', () => {
  it('platform-mobile-responsive.css existe y no está vacío', () => {
    const p = path.join(ROOT, MOBILE_CSS);
    expect(fs.existsSync(p)).toBe(true);
    expect(fs.statSync(p).size).toBeGreaterThan(1500);
  });

  it('el layout raíz carga platform-mobile-responsive.css AL FINAL (post-widgets)', () => {
    const src = read(LAYOUT);
    expect(src).toMatch(/import\s+['"]\.\/plataforma\/platform-mobile-responsive\.css['"]/);
    // Se importa después de platform-widgets.css para que los breakpoints
    // ganen sin depender de !important.
    const idxWidgets = src.indexOf('platform-widgets.css');
    const idxMobile = src.indexOf('platform-mobile-responsive.css');
    expect(idxMobile).toBeGreaterThan(idxWidgets);
  });
});

describe('[mobile-responsive] platform.css — nav tabs YA no se ocultan', () => {
  const css = read(PLATFORM_CSS);

  it('el media 980px NO tiene `.gp-nav-links { display: none }`', () => {
    // Regresión: antes se ocultaban por completo sin alternativa.
    expect(css).not.toMatch(/\.gp-nav-links\s*\{\s*display:\s*none\s*;?\s*\}/);
  });

  it('el media 980px hace tabs scrollables horizontalmente', () => {
    expect(css).toMatch(
      /@media\s*\(max-width:\s*980px\)[\s\S]{0,2000}\.gp-nav-links\s*\{[\s\S]{0,400}overflow-x:\s*auto/,
    );
  });

  it('las tabs no se rompen visualmente (flex-shrink 0 + scroll-snap)', () => {
    expect(css).toMatch(
      /@media\s*\(max-width:\s*980px\)[\s\S]{0,2500}\.gp-nav-links\s+a\s*\{[\s\S]{0,300}flex-shrink:\s*0/,
    );
    expect(css).toMatch(
      /@media\s*\(max-width:\s*980px\)[\s\S]{0,2500}\.gp-nav-links\s+a\s*\{[\s\S]{0,300}scroll-snap-align:\s*start/,
    );
  });

  it('gp-nav-inner permite wrap con height auto en móvil', () => {
    expect(css).toMatch(
      /@media\s*\(max-width:\s*980px\)[\s\S]{0,1500}\.gp-nav-inner\s*\{[\s\S]{0,400}flex-wrap:\s*wrap/,
    );
    expect(css).toMatch(
      /@media\s*\(max-width:\s*980px\)[\s\S]{0,1500}\.gp-nav-inner\s*\{[\s\S]{0,400}height:\s*auto/,
    );
  });
});

describe('[mobile-responsive] breakpoints presentes en el archivo nuevo', () => {
  const css = read(MOBILE_CSS);

  it('cubre 640px (legales), 480px (mobile), 390px (small)', () => {
    expect(css).toMatch(/@media\s*\(max-width:\s*640px\)/);
    expect(css).toMatch(/@media\s*\(max-width:\s*480px\)/);
    expect(css).toMatch(/@media\s*\(max-width:\s*390px\)/);
  });
});

describe('[mobile-responsive] reglas críticas por componente', () => {
  const css = read(MOBILE_CSS);

  it('dropdown de creadores no desborda viewport (max-width: calc(100vw - 32px))', () => {
    expect(css).toMatch(
      /@media\s*\(max-width:\s*480px\)[\s\S]{0,4000}\.gp-dd-menu\s*\{[\s\S]{0,400}max-width:\s*calc\(100vw\s*-\s*32px\)/,
    );
  });

  it('UserPill tiene tap target ≥ 40px', () => {
    expect(css).toMatch(
      /@media\s*\(max-width:\s*480px\)[\s\S]{0,4000}\.gp-user-pill\s*\{[\s\S]{0,300}min-height:\s*(4[0-9]|[5-9][0-9]|[1-9][0-9]{2,})px/,
    );
  });

  it('UserPill oculta el nombre en móvil para dar aire', () => {
    expect(css).toMatch(
      /@media\s*\(max-width:\s*480px\)[\s\S]{0,4000}\.gp-user-name\s*\{\s*display:\s*none/,
    );
  });

  it('hero: líneas decorativas tienen max-width en 480', () => {
    expect(css).toMatch(
      /@media\s*\(max-width:\s*480px\)[\s\S]{0,4000}\.gp-hero-sub\s+\.line\s*\{[\s\S]{0,200}max-width/,
    );
  });

  it('KeyDrop card: padding compacto y btn con área táctil generosa', () => {
    expect(css).toMatch(
      /@media\s*\(max-width:\s*480px\)[\s\S]{0,5000}\.p-keydrop\s+\.pad\s*\{[\s\S]{0,200}padding/,
    );
  });

  it('SkinClub card: stack en columna y padding reducido', () => {
    expect(css).toMatch(
      /@media\s*\(max-width:\s*480px\)[\s\S]{0,5500}\.p-skinclub\s*\{[\s\S]{0,200}padding/,
    );
    expect(css).toMatch(
      /@media\s*\(max-width:\s*480px\)[\s\S]{0,5500}\.p-skinclub\s+\.code-row\s*\{[\s\S]{0,200}flex-direction:\s*column/,
    );
  });

  it('ExternalGiveawayCard: min-height fluida en móvil', () => {
    expect(css).toMatch(
      /@media\s*\(max-width:\s*480px\)[\s\S]{0,6000}\.gp-external-card\s*\{[\s\S]{0,200}min-height:\s*auto/,
    );
  });

  it('Recompensas (Shop): tap target de botón ≥ 44px', () => {
    expect(css).toMatch(
      /@media\s*\(max-width:\s*480px\)[\s\S]{0,7000}\.gp-shop-btn\s*\{[\s\S]{0,300}min-height:\s*(4[4-9]|[5-9][0-9]|[1-9][0-9]{2,})px/,
    );
  });

  it('Recompensas: tabs con min-height ≥ 40px', () => {
    expect(css).toMatch(
      /@media\s*\(max-width:\s*480px\)[\s\S]{0,7000}\.gp-shop-tab\s*\{[\s\S]{0,300}min-height:\s*(4[0-9]|[5-9][0-9]|[1-9][0-9]{2,})px/,
    );
  });

  it('Profile stats colapsan a 1 columna en 480', () => {
    expect(css).toMatch(
      /@media\s*\(max-width:\s*480px\)[\s\S]{0,7500}\.gp-profile-stats\s*\{[\s\S]{0,200}grid-template-columns:\s*1fr/,
    );
  });

  it('Streak grid reduce gap + padding en 480', () => {
    expect(css).toMatch(
      /@media\s*\(max-width:\s*480px\)[\s\S]{0,7500}\.gp-streak-grid\s*\{[\s\S]{0,200}gap/,
    );
  });

  it('Legal wrap reduce padding en 640', () => {
    expect(css).toMatch(
      /@media\s*\(max-width:\s*640px\)[\s\S]{0,1500}\.gp-legal-wrap\s*\{[\s\S]{0,300}padding-(?:left|right):\s*\d+px/,
    );
  });

  it('Sub-tag del logo se oculta en 390 (solo wordmark principal)', () => {
    expect(css).toMatch(
      /@media\s*\(max-width:\s*390px\)[\s\S]{0,1500}\.gp-logo-tag\s+span\s*\{\s*display:\s*none/,
    );
  });
});

describe('[mobile-responsive] anti-overflow horizontal — safety net', () => {
  const css = read(MOBILE_CSS);
  it('.giveaway-platform tiene overflow-x: clip global', () => {
    expect(css).toMatch(/\.giveaway-platform\b[\s\S]{0,200}overflow-x:\s*clip/);
  });
});

describe('[mobile-responsive] no rompe reglas de lógica (CSS-only)', () => {
  const css = read(MOBILE_CSS);
  it('no incluye JS/TS ni @import CSS externo', () => {
    // El archivo es CSS puro. No hay @import de fuentes o CSS externo aquí.
    expect(css).not.toMatch(/@import/);
    expect(css).not.toMatch(/document\.|window\.|require\(/);
  });

  it('no toca lógica de canje ni auth (no aparece token de payment/monedas)', () => {
    // Safety: solo cambios visuales. Ningún selector debería afectar
    // funciones ocultas de compra/cripto/pricing.
    expect(css).not.toMatch(/\bcomprar\b|\bcompra\b/i);
    expect(css).not.toMatch(/💸|💰|🪙/);
  });
});
