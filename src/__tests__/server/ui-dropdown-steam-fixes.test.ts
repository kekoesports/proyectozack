/**
 * UI/UX fixes post-#174:
 *   1. Dropdown de creadores — avatar 1:1 forzado, no se deforma.
 *   2. CTA login Steam — logo real (SVG) + copy premium en 2 líneas.
 *   3. SteamAvatar — wrapper con dimensiones fijas + <img> object-fit cover.
 */

import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '..', '..', '..');
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf-8');

describe('[ui] CreatorDropdown avatar — aspect-ratio 1:1 forzado', () => {
  const src = read('src/features/giveaway-platform/components/CreatorDropdown.tsx');
  const css = read('src/app/sorteos/plataforma/platform-dropdown.css');

  it('CreatorAvatar envuelve la <Image> con span de dimensiones fijas y fill', () => {
    // Wrapper con width/height inline.
    expect(src).toMatch(/style=\{\{\s*width:\s*size,\s*height:\s*size\s*\}\}/);
    // <Image fill> dentro (no <Image width={size}> deformable).
    expect(src).toMatch(/<Image[\s\S]{0,200}fill[\s\S]{0,120}sizes=\{`\$\{size\}px`\}/);
  });

  it('CSS del avatar fuerza aspect-ratio 1/1 + overflow hidden', () => {
    expect(css).toMatch(/\.gp-dd-avatar\s*\{[\s\S]{0,400}aspect-ratio:\s*1\s*\/\s*1/);
    expect(css).toMatch(/\.gp-dd-avatar\s*\{[\s\S]{0,400}overflow:\s*hidden/);
  });

  it('CSS del <Image> hijo aplica object-fit cover + object-position center', () => {
    expect(css).toMatch(/\.gp-dd-avatar-img\s*\{[\s\S]{0,150}object-fit:\s*cover/);
    expect(css).toMatch(/\.gp-dd-avatar-img\s*\{[\s\S]{0,150}object-position:\s*center/);
  });

  it('el texto del item tiene min-width: 0 + truncado por ellipsis', () => {
    expect(css).toMatch(/\.gp-dd-item\s*>\s*span:not\(\.gp-dd-avatar\)\s*\{[\s\S]{0,200}min-width:\s*0/);
    expect(css).toMatch(/\.gp-dd-item\s+b\s*\{[\s\S]{0,300}text-overflow:\s*ellipsis/);
  });
});

describe('[ui] SteamLoginButton — CTA premium con logo SVG', () => {
  const src = read('src/features/giveaway-platform/components/SteamLoginButton.tsx');
  const css = read('src/app/sorteos/plataforma/platform-steam-login.css');

  it('anchor apunta a /api/auth/steam/login (con ?returnTo=) y aria-label descriptivo', () => {
    // Desde 2026-07-10 el botón añade `?returnTo=<encoded>` al href para
    // preservar el sitio de origen tras el login OpenID. El destino base
    // sigue siendo `/api/auth/steam/login`; el href se compone en runtime
    // vía la variable `href` del componente.
    expect(src).toMatch(/\/api\/auth\/steam\/login\?returnTo=/);
    expect(src).toMatch(/href=\{href\}/);
    expect(src).toMatch(/aria-label="Iniciar sesión con Steam"/);
  });

  it('renderiza SVG del logo Steam inline (currentColor para respetar hover)', () => {
    expect(src).toMatch(/<svg[\s\S]{0,80}gp-steam-login-logo/);
    expect(src).toMatch(/stroke="currentColor"|fill="currentColor"/);
    // Nunca usa el emoji 🎮 como icono principal.
    expect(src).not.toMatch(/🎮/);
  });

  it('copy en 2 líneas: lead "Iniciar sesión con" + brand "STEAM"', () => {
    expect(src).toMatch(/gp-steam-login-lead[\s\S]{0,80}Iniciar sesión con/);
    expect(src).toMatch(/gp-steam-login-brand[\s\S]{0,80}STEAM/);
  });

  it('acepta size md/lg', () => {
    expect(src).toMatch(/size\?:\s*'md'\s*\|\s*'lg'/);
  });

  it('CSS: gradient SP + hover con translateY + focus-visible outline', () => {
    expect(css).toMatch(/\.gp-steam-login\s*\{[\s\S]{0,400}background:\s*var\(--sp-grad\)/);
    expect(css).toMatch(/\.gp-steam-login:hover\s*\{[\s\S]{0,200}translateY\(-1px\)/);
    expect(css).toMatch(/\.gp-steam-login:focus-visible\s*\{[\s\S]{0,150}outline:\s*2px\s+solid\s+#fff/);
  });

  it('CSS: mobile responsive (max-width: 480px) reduce tamaño', () => {
    expect(css).toMatch(/@media\s*\(max-width:\s*480px\)/);
  });
});

describe('[ui] UserPill usa SteamLoginButton cuando !loggedIn', () => {
  const src = read('src/features/giveaway-platform/components/UserPill.tsx');

  it('importa y renderiza SteamLoginButton size="md"', () => {
    expect(src).toMatch(/import\s*\{\s*SteamLoginButton\s*\}/);
    expect(src).toMatch(/if\s*\(!loggedIn\)[\s\S]{0,300}<SteamLoginButton\s+size="md"\s*\/>/);
  });

  it('el emoji 🎮 hardcoded ya no aparece en el CTA', () => {
    // 🎮 solo aparecía en el botón antiguo "🎮 Iniciar sesión con Steam".
    // Otros emojis del pill (⭐ puntos) siguen siendo legítimos.
    expect(src).not.toMatch(/🎮\s+Iniciar sesión con Steam/);
  });
});

describe('[ui] PlatformCreatorLanding — CTA login destacado cuando !session', () => {
  const src = read('src/features/giveaway-platform/components/PlatformCreatorLanding.tsx');

  it('importa y monta SteamLoginButton size="lg" en el bloque sin sesión', () => {
    expect(src).toMatch(/import\s*\{\s*SteamLoginButton\s*\}/);
    expect(src).toMatch(/gp-login-prompt[\s\S]{0,400}<SteamLoginButton\s+size="lg"\s*\/>/);
  });
});

describe('[ui] SteamAvatar refactor — wrapper fijo + object-fit cover', () => {
  const src = read('src/features/giveaway-platform/components/SteamAvatar.tsx');
  const css = read('src/app/sorteos/plataforma/platform-steam-avatar.css');

  it('<img> ya no recibe width/height como atributos HTML (el wrapper los aplica)', () => {
    // Buscamos que el <img> renderizado no lleve width={size} height={size}.
    const imgBlock = /show\s*\)\s*\{[\s\S]{0,600}return\s*\([\s\S]{0,600}<img[\s\S]{0,600}\/>/.exec(src)?.[0] ?? '';
    expect(imgBlock).not.toMatch(/width=\{size\}/);
    expect(imgBlock).not.toMatch(/height=\{size\}/);
  });

  it('wrapper <span> recibe width/height/font-size vía style', () => {
    expect(src).toMatch(/width:\s*size,\s*height:\s*size,\s*fontSize:\s*Math\.round\(size\s*\*\s*0\.42\)/);
  });

  it('CSS del avatar Steam fuerza aspect-ratio 1/1 + overflow hidden', () => {
    expect(css).toMatch(/\.gp-steam-avatar\s*\{[\s\S]{0,400}aspect-ratio:\s*1\s*\/\s*1/);
    expect(css).toMatch(/\.gp-steam-avatar\s*\{[\s\S]{0,400}overflow:\s*hidden/);
  });

  it('CSS del <img> interior tiene width 100% + object-fit cover', () => {
    expect(css).toMatch(/\.gp-steam-avatar-img\s*\{[\s\S]{0,300}width:\s*100%/);
    expect(css).toMatch(/\.gp-steam-avatar-img\s*\{[\s\S]{0,300}object-fit:\s*cover/);
  });
});

describe('[ui] Layout raíz /sorteos carga los CSS nuevos', () => {
  const src = read('src/app/sorteos/layout.tsx');

  it('platform-dropdown.css se importa (avatar del selector)', () => {
    expect(src).toMatch(/import\s+'\.\/plataforma\/platform-dropdown\.css'/);
  });

  it('platform-steam-login.css se importa (CTA Steam)', () => {
    expect(src).toMatch(/import\s+'\.\/plataforma\/platform-steam-login\.css'/);
  });
});

describe('[ui] índice /sorteos — card avatar usa <Image fill>', () => {
  const src = read('src/app/sorteos/page.tsx');

  it('<Image fill sizes="72px"> en la card del creador (no width/height deformables)', () => {
    expect(src).toMatch(/<Image[\s\S]{0,120}fill[\s\S]{0,120}sizes="72px"/);
    // width={72} height={72} como atributos ya no debe existir en este bloque.
    expect(src).not.toMatch(/<Image[\s\S]{0,60}src=\{c\.photoUrl\}[\s\S]{0,120}width=\{72\}/);
  });
});
