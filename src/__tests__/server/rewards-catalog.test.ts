/**
 * Contratos estructurales del catálogo de recompensas (Fase 1 — real).
 *
 * Fuente de verdad: `src/features/giveaway-platform/constants/rewards-catalog.ts`.
 * Doc: `docs/sorteos-rewards-catalog.md`.
 *
 * Verifica:
 *  - 8 skins CS2 en REAL_STEAM_REWARDS con metadata real.
 *  - Cada una tiene nombre real, imagen local, precio en puntos, stock 1.
 *  - Cada una conserva su Steam Market URL (trazabilidad interna).
 *  - Las 8 imágenes locales existen bajo public/images/rewards/.
 *  - UI pública no muestra precio en €/$.
 *  - No hay fetch runtime a Steam Market en src/.
 *  - Script enrich-rewards.ts detecta CI/prod y aborta.
 *  - Script de seed requiere CONFIRM_SEED_STEAM_REWARDS.
 */

import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '..', '..', '..');
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf-8');

const STEAM_MARKET_URLS = [
  'https://steamcommunity.com/market/listings/730/G1804208D0B3004?category_Type=CSGO_Type_Pistol&category_Exterior=WearCategory2&appid=730',
  'https://steamcommunity.com/market/listings/730/G183D20C1053004?category_Type=CSGO_Type_Pistol&category_Exterior=WearCategory2&appid=730',
  'https://steamcommunity.com/market/listings/730/G181020CC093004?category_Type=CSGO_Type_Pistol&category_Type=CSGO_Type_Rifle&category_Exterior=WearCategory2&appid=730',
  'https://steamcommunity.com/market/listings/730/G180720A1063004?category_Type=CSGO_Type_Pistol&category_Type=CSGO_Type_Rifle&category_Exterior=WearCategory2&appid=730&detail=555779260423308555',
  'https://steamcommunity.com/market/listings/730/G181020CC043004?category_Type=CSGO_Type_Pistol&category_Type=CSGO_Type_Rifle&category_Exterior=WearCategory2&appid=730',
  'https://steamcommunity.com/market/listings/730/G180420C3073004?category_Type=CSGO_Type_Pistol&category_Type=CSGO_Type_Rifle&category_Exterior=WearCategory2&appid=730',
  'https://steamcommunity.com/market/listings/730/G1804208F093004?category_Type=CSGO_Type_Pistol&category_Type=CSGO_Type_Rifle&category_Exterior=WearCategory2&appid=730',
  'https://steamcommunity.com/market/listings/730/G180920C6063004?category_Type=CSGO_Type_SniperRifle&category_Exterior=WearCategory2&appid=730&detail=555779260423635183',
] as const;

const SKIN_NAMES = [
  'Glock-18 | Fully Tuned',
  'USP-S | Cortex',
  'M4A4 | Temukau',
  'AK-47 | Asiimov',
  'M4A4 | Desolate Space',
  'Glock-18 | Vogue',
  'Glock-18 | Block-18',
  'AWP | Atheris',
] as const;

const CATALOG_PATH = 'src/features/giveaway-platform/constants/rewards-catalog.ts';
const DOC_PATH = 'docs/sorteos-rewards-catalog.md';
const SEED_PATH = 'scripts/seed-socialpro-rewards-steam.ts';
const ENRICH_PATH = 'scripts/enrich-rewards.ts';

describe('[rewards-catalog] REAL_STEAM_REWARDS con metadata real', () => {
  const src = read(CATALOG_PATH);

  it('exporta REAL_STEAM_REWARDS como readonly CatalogReward[]', () => {
    expect(src).toMatch(/export const REAL_STEAM_REWARDS:\s*readonly\s+CatalogReward\[\]/);
  });

  it('define CatalogReward con campos requeridos (metadata real)', () => {
    expect(src).toMatch(/name:\s*string/);
    expect(src).toMatch(/costPoints:\s*number/);
    expect(src).toMatch(/stock:\s*number/);
    expect(src).toMatch(/imageUrl:\s*string/);
    expect(src).toMatch(/steamMarketUrl:\s*string/);
    expect(src).toMatch(/delivery:\s*RewardDelivery/);
    expect(src).toMatch(/requiresManualReview:\s*boolean/);
  });

  it('los 8 nombres reales están en el catálogo', () => {
    for (const name of SKIN_NAMES) {
      expect(src).toContain(name);
    }
  });

  it('los 8 URLs de Steam Market están en el catálogo (trazabilidad)', () => {
    for (const url of STEAM_MARKET_URLS) {
      expect(src).toContain(url);
    }
  });

  it('las 8 imágenes locales están referenciadas', () => {
    const expected = [
      '/images/rewards/glock-18-fully-tuned-ft.png',
      '/images/rewards/usp-s-cortex-ft.png',
      '/images/rewards/m4a4-temukau-ft.png',
      '/images/rewards/ak-47-asiimov-ft.png',
      '/images/rewards/m4a4-desolate-space-ft.png',
      '/images/rewards/glock-18-vogue-ft.png',
      '/images/rewards/glock-18-block-18-ft.png',
      '/images/rewards/awp-atheris-ft.png',
    ];
    for (const p of expected) {
      expect(src).toContain(p);
    }
  });

  it('las 8 imágenes existen en el filesystem', () => {
    const files = [
      'public/images/rewards/glock-18-fully-tuned-ft.png',
      'public/images/rewards/usp-s-cortex-ft.png',
      'public/images/rewards/m4a4-temukau-ft.png',
      'public/images/rewards/ak-47-asiimov-ft.png',
      'public/images/rewards/m4a4-desolate-space-ft.png',
      'public/images/rewards/glock-18-vogue-ft.png',
      'public/images/rewards/glock-18-block-18-ft.png',
      'public/images/rewards/awp-atheris-ft.png',
    ];
    for (const f of files) {
      const abs = path.join(ROOT, f);
      expect(fs.existsSync(abs)).toBe(true);
      // Cada imagen > 10KB (real, no placeholder).
      expect(fs.statSync(abs).size).toBeGreaterThan(10_000);
    }
  });

  it('los 8 items tienen stock: 1 (stock limitado por defecto)', () => {
    const matches = src.match(/stock:\s*1,/g) ?? [];
    expect(matches.length).toBeGreaterThanOrEqual(8);
  });

  it('los 8 items marcan status: "active" (canjeables)', () => {
    const matches = src.match(/status:\s*'active'/g) ?? [];
    expect(matches.length).toBeGreaterThanOrEqual(8);
  });

  it('los 8 items marcan delivery: "steam_trade_offer" + requiresManualReview: true', () => {
    const delivery = src.match(/delivery:\s*'steam_trade_offer'/g) ?? [];
    const review = src.match(/requiresManualReview:\s*true/g) ?? [];
    expect(delivery.length).toBeGreaterThanOrEqual(8);
    expect(review.length).toBeGreaterThanOrEqual(8);
  });

  it('los 8 items son categoría skin + game CS2', () => {
    const skins = src.match(/category:\s*'skin'/g) ?? [];
    const cs2 = src.match(/game:\s*'CS2'/g) ?? [];
    expect(skins.length).toBeGreaterThanOrEqual(8);
    expect(cs2.length).toBeGreaterThanOrEqual(8);
  });

  it('precios en puntos son los confirmados por el owner (números redondos)', () => {
    // Verificación directa de los 8 precios aprobados.
    for (const price of ['104_500', '6_500', '57_700', '70_000', '23_200', '6_700', '800', '8_100']) {
      expect(src).toContain(`costPoints: ${price}`);
    }
  });
});

describe('[rewards-catalog] doc de política', () => {
  const doc = read(DOC_PATH);

  it('doc existe y no está vacío', () => {
    expect(fs.existsSync(path.join(ROOT, DOC_PATH))).toBe(true);
    expect(fs.statSync(path.join(ROOT, DOC_PATH)).size).toBeGreaterThan(2500);
  });

  it('los 8 nombres reales están en el doc (tabla + narrativa)', () => {
    for (const name of SKIN_NAMES) {
      // Markdown escapa el pipe `|` como `\|` en tablas. Buscamos ambas variantes.
      const escapedName = name.replace(/\|/g, '\\|');
      const found = doc.includes(name) || doc.includes(escapedName);
      expect(found).toBe(true);
    }
  });

  it('comando exacto de seed documentado', () => {
    expect(doc).toMatch(/CONFIRM_SEED_STEAM_REWARDS=I_ACCEPT_ADD_STEAM_REWARDS/);
    expect(doc).toMatch(/npx tsx scripts\/seed-socialpro-rewards-steam\.ts/);
  });

  it('deja claro que no hay scraping runtime + no fetch en prod', () => {
    expect(doc).toMatch(/No hay scraping runtime/i);
    expect(doc).toMatch(/No hay fetch runtime/i);
  });
});

describe('[rewards-catalog] seed script requiere confirmación explícita', () => {
  const src = read(SEED_PATH);

  it('usa el token de confirmación exacto', () => {
    expect(src).toMatch(/CONFIRM_SEED_STEAM_REWARDS/);
    expect(src).toMatch(/I_ACCEPT_ADD_STEAM_REWARDS/);
  });

  it('aborta si la env var falta o no matchea', () => {
    expect(src).toMatch(/if\s*\(confirm\s*!==\s*CONFIRM_TOKEN\)/);
    expect(src).toMatch(/process\.exit\(1\)/);
  });

  it('lee de REAL_STEAM_REWARDS (fuente de verdad, no strings hardcoded)', () => {
    expect(src).toMatch(/import\s*\{[^}]*REAL_STEAM_REWARDS[^}]*\}\s*from/);
  });

  it('es idempotente — UPDATE si el name existe, INSERT si no', () => {
    expect(src).toMatch(/db\.query\.shopItems\.findFirst\({[\s\S]{0,120}eq\(shopItems\.name/);
    expect(src).toMatch(/db\s*\.insert\(shopItems\)/);
    expect(src).toMatch(/db\s*\.update\(shopItems\)/);
  });

  it('NUNCA borra items existentes (sin delete)', () => {
    expect(src).not.toMatch(/db\s*\.delete/);
  });
});

describe('[rewards-catalog] script enrich-rewards detecta CI/prod', () => {
  const src = read(ENRICH_PATH);

  it('bloquea si CI=true, VERCEL=1, GITHUB_ACTIONS, o NODE_ENV=production', () => {
    expect(src).toMatch(/CI[\s\S]{0,80}'true'/);
    expect(src).toMatch(/NODE_ENV[\s\S]{0,80}'production'/);
    expect(src).toMatch(/VERCEL[\s\S]{0,80}'1'/);
    expect(src).toMatch(/GITHUB_ACTIONS/);
  });

  it('rate limit de 3s entre requests + retries', () => {
    expect(src).toMatch(/RATE_LIMIT_MS\s*=\s*3_?000/);
    expect(src).toMatch(/MAX_RETRIES/);
  });

  it('NO modifica DB (no import de shopItems ni db.insert)', () => {
    expect(src).not.toMatch(/from\s*['"].*schema['"]/);
    expect(src).not.toMatch(/db\.insert|db\.update|db\.delete/);
  });

  it('NO actualiza rewards-catalog.ts automáticamente (solo lee)', () => {
    expect(src).not.toMatch(/fs\.writeFileSync\(.*rewards-catalog/);
  });

  it('output JSON en .scratch/ para revisión manual', () => {
    expect(src).toMatch(/\.scratch/);
    expect(src).toMatch(/steam-enrich-/);
  });
});

describe('[rewards-catalog] UI PlatformShop consume el catálogo', () => {
  const src = read('src/features/giveaway-platform/components/PlatformShop.tsx');

  it('importa PLANNED_TEAM_MERCH del catálogo (REAL_STEAM_REWARDS vive en DB tras seed)', () => {
    expect(src).toMatch(/import\s*\{[^}]*PLANNED_TEAM_MERCH[^}]*\}\s*from\s*'@\/features\/giveaway-platform\/constants\/rewards-catalog'/);
    expect(src).not.toMatch(/import\s*\{[^}]*REAL_STEAM_REWARDS/);
  });

  it('YA no hay bloque separado "Próximas en tienda" — todo en un grid', () => {
    // Regresión: el bloque separado "Próximas en tienda · Skins CS2" está
    // eliminado. Ahora es un solo grid con `PLANNED_TEAM_MERCH` mezclado.
    expect(src).not.toMatch(/Próximas en tienda/);
    expect(src).not.toMatch(/rewards-showcase-title/);
    expect(src).not.toMatch(/gp-rewards-upcoming/);
    expect(src).not.toMatch(/function ShowcaseCard/);
  });

  it('team merch dedupica contra items ya en DB (por name)', () => {
    // Cuando el owner active un item equivalente en DB, se filtra fuera.
    expect(src).toMatch(/dbNames\s*=\s*new Set\(items\.map\(\(i\)\s*=>\s*i\.name\)\)/);
    expect(src).toMatch(/PLANNED_TEAM_MERCH\.filter\([\s\S]{0,120}!dbNames\.has\(m\.name\)/);
  });

  it('cards planned muestran precio en puntos, no en €/$', () => {
    expect(src).toMatch(/⭐[\s\S]{0,80}reward\.costPoints|reward\.costPoints[\s\S]{0,80}⭐/);
    expect(src).not.toMatch(/reward\.costPoints[\s\S]{0,20}€/);
    expect(src).not.toMatch(/reward\.costPoints[\s\S]{0,20}\$\D/);
  });

  it('cards de team merch tienen botón "Próximamente" (deshabilitado), no Canjear', () => {
    // UpcomingCard renderiza un botón disabled con label "Próximamente".
    expect(src).toMatch(/function UpcomingCard/);
    expect(src).toMatch(/Próximamente/);
    const upcomingFn = src.match(/function UpcomingCard[\s\S]*?^}$/m)?.[0] ?? '';
    expect(upcomingFn).not.toMatch(/handleRedeem/);
    expect(upcomingFn).toMatch(/disabled/);
  });
});

describe('[rewards-catalog] no fetch runtime a Steam en src/', () => {
  const srcDir = path.join(ROOT, 'src');
  const walk = (dir: string): string[] => {
    const out: string[] = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === '__tests__' || entry.name === 'node_modules') continue;
        out.push(...walk(full));
      } else if (/\.(ts|tsx|js|jsx)$/.test(entry.name)) {
        out.push(full);
      }
    }
    return out;
  };

  it('ningún archivo src/ (excepto catálogo) menciona steamcommunity.com/market', () => {
    const files = walk(srcDir);
    for (const f of files) {
      if (f.endsWith('rewards-catalog.ts')) continue;
      const src = fs.readFileSync(f, 'utf-8');
      expect(src).not.toMatch(/steamcommunity\.com\/market/);
    }
  });

  it('ningún archivo src/ hace fetch/axios a community.steamstatic.com', () => {
    const files = walk(srcDir);
    for (const f of files) {
      const src = fs.readFileSync(f, 'utf-8');
      expect(src).not.toMatch(/fetch\([^)]*community\.steamstatic\.com/);
      expect(src).not.toMatch(/axios[^;]{0,80}community\.steamstatic\.com/);
    }
  });
});

describe('[rewards-catalog] conversión $/€ → puntos no expuesta al usuario', () => {
  const src = read('src/features/giveaway-platform/components/PlatformShop.tsx');
  it('PlatformShop no muestra ratio de conversión ni precios en €/$', () => {
    expect(src).not.toMatch(/1\s*USD\s*[^.]{0,60}1\.?000\s*puntos/i);
    expect(src).not.toMatch(/1\s*EUR\s*[^.]{0,60}1\.?100\s*puntos/i);
    expect(src).not.toMatch(/equivalente\s*en\s*€/i);
    expect(src).not.toMatch(/equivalente\s*en\s*\$/i);
  });
});
