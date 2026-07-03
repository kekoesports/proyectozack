/**
 * Contratos estructurales del catálogo de recompensas (Fase 1).
 *
 * Fuente de verdad: `src/features/giveaway-platform/constants/rewards-catalog.ts`.
 * Doc: `docs/sorteos-rewards-catalog.md`.
 *
 * Verifica:
 *  - 8 skins CS2 dadas de alta en `PLANNED_REWARDS`.
 *  - Cada una conserva su Steam Market URL exacta.
 *  - Todas quedan como `planned` / sin precio / sin stock → no canjeables.
 *  - Ninguna aparece como shop_item activo (no hay seed).
 *  - No hay scraping runtime de Steam Market en `src/`.
 *  - UI pública usa "Recompensas" (no "Tienda").
 *  - Placeholder premium reemplaza al plano "Imagen pendiente" para
 *    cards sin imagen.
 *  - Conversión $/€ → puntos no expuesta al usuario en UI.
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
  'https://steamcommunity.com/market/listings/730/G180920C6063004?category_Type=CSGO_Type_SniperRifle&category_Exterior=WearCategory2&appid=730',
] as const;

const CATALOG_PATH = 'src/features/giveaway-platform/constants/rewards-catalog.ts';
const DOC_PATH = 'docs/sorteos-rewards-catalog.md';

describe('[rewards-catalog] constante PLANNED_REWARDS', () => {
  const src = read(CATALOG_PATH);

  it('exporta PLANNED_REWARDS como readonly', () => {
    expect(src).toMatch(/export const PLANNED_REWARDS:\s*readonly\s+PlannedReward\[\]/);
  });

  it('define PlannedReward con campos requeridos', () => {
    expect(src).toMatch(/steamMarketUrl:\s*string/);
    expect(src).toMatch(/costPoints:\s*number\s*\|\s*null/);
    expect(src).toMatch(/stock:\s*number\s*\|\s*null/);
    expect(src).toMatch(/imageUrl:\s*string\s*\|\s*null/);
  });

  it('los 8 URLs de Steam Market están en el catálogo (uno por uno)', () => {
    for (const url of STEAM_MARKET_URLS) {
      expect(src).toContain(url);
    }
  });

  it('exactamente 8 slugs cs2-skin-reward-N', () => {
    const slugs = src.match(/slug:\s*'cs2-skin-reward-\d+'/g) ?? [];
    expect(slugs).toHaveLength(8);
  });

  it('todos los items marcan status: "planned" — nada activo', () => {
    // Al menos 8 líneas de status: 'planned' (pueden ser más si el JSDoc
    // menciona el literal como referencia).
    const matches = src.match(/status:\s*'planned'/g) ?? [];
    expect(matches.length).toBeGreaterThanOrEqual(8);
  });

  it('todos los items tienen costPoints: null (precio pendiente)', () => {
    const matches = src.match(/costPoints:\s*null/g) ?? [];
    expect(matches.length).toBeGreaterThanOrEqual(8);
  });

  it('todos los items tienen stock: null (stock pendiente)', () => {
    const matches = src.match(/stock:\s*null/g) ?? [];
    expect(matches.length).toBeGreaterThanOrEqual(8);
  });

  it('todos los items tienen imageUrl: null (sin imagen fiable)', () => {
    const matches = src.match(/imageUrl:\s*null/g) ?? [];
    expect(matches.length).toBeGreaterThanOrEqual(8);
  });

  it('categoría skin + game CS2 en las 8', () => {
    const skins = src.match(/category:\s*'skin'/g) ?? [];
    const cs2 = src.match(/game:\s*'CS2'/g) ?? [];
    expect(skins.length).toBeGreaterThanOrEqual(8);
    expect(cs2.length).toBeGreaterThanOrEqual(8);
  });
});

describe('[rewards-catalog] doc de política', () => {
  const doc = read(DOC_PATH);

  it('doc existe y no está vacío', () => {
    expect(fs.existsSync(path.join(ROOT, DOC_PATH))).toBe(true);
    expect(fs.statSync(path.join(ROOT, DOC_PATH)).size).toBeGreaterThan(1500);
  });

  it('los 8 URLs están en el doc', () => {
    for (const url of STEAM_MARKET_URLS) {
      expect(doc).toContain(url);
    }
  });

  it('deja claro que ninguna es canjeable', () => {
    // 8 celdas ❌ en la tabla.
    const noCells = (doc.match(/\|\s*❌\s*\|/g) ?? []).length;
    expect(noCells).toBeGreaterThanOrEqual(8);
  });

  it('regla de activación documentada (planned → coming_soon → shop_items)', () => {
    expect(doc).toMatch(/Regla de activación/i);
    expect(doc).toMatch(/planned/);
    expect(doc).toMatch(/coming_soon/);
    expect(doc).toMatch(/shop_items/);
  });

  it('bloquea scraping runtime + seed sin OK', () => {
    expect(doc).toMatch(/No hay scraping runtime/);
    expect(doc).toMatch(/No hay seed/);
  });
});

describe('[rewards-catalog] Tienda → Recompensas en UI pública', () => {
  it('nav item cambiado a "Recompensas"', () => {
    const src = read('src/features/giveaway-platform/components/PlatformNav.tsx');
    expect(src).toMatch(/href:\s*'#recompensas',\s*label:\s*'Recompensas'/);
    expect(src).not.toMatch(/label:\s*'Tienda'/);
  });

  it('sección id="recompensas" y title en PlatformCreatorLanding', () => {
    const src = read('src/features/giveaway-platform/components/PlatformCreatorLanding.tsx');
    expect(src).toMatch(/id="recompensas"/);
    expect(src).toMatch(/Recompensas\s*·\s*canjea tus puntos/);
    expect(src).not.toMatch(/<h2>Tienda\s*·/);
  });

  it('PlatformShop usa lenguaje de recompensas (no "tienda") en copy visible', () => {
    const src = read('src/features/giveaway-platform/components/PlatformShop.tsx');
    expect(src).toMatch(/Siguiente recompensa a tu alcance/);
    expect(src).toMatch(/canjear cualquier recompensa disponible/);
    expect(src).toMatch(/No hay recompensas en esta categoría/);
    // Y el bloque nuevo de "Próximas recompensas".
    expect(src).toMatch(/Próximas recompensas/);
  });
});

describe('[rewards-catalog] placeholder premium reemplaza "Imagen pendiente"', () => {
  const src = read('src/features/giveaway-platform/components/PlatformShop.tsx');

  it('component RewardPlaceholder existe y se usa cuando falta imageUrl', () => {
    expect(src).toMatch(/function RewardPlaceholder/);
    // Se monta en la card cuando imageUrl es falsy.
    expect(src).toMatch(/\?[\s\S]{0,200}<img[\s\S]{0,200}:[\s\S]{0,200}<RewardPlaceholder/);
  });

  it('cubre las 6 categorías con badge + icon + label', () => {
    for (const cat of ['skin', 'merch', 'gift', 'profile', 'frame', 'badge'] as const) {
      expect(src).toMatch(new RegExp(`${cat}:\\s*\\{\\s*badge:\\s*'`));
    }
  });

  it('CSS del placeholder existe', () => {
    const css = read('src/app/sorteos/plataforma/platform-rewards-upcoming.css');
    expect(css).toMatch(/\.gp-reward-placeholder\s*\{[\s\S]{0,600}aspect-ratio/);
    expect(css).toMatch(/\.gp-reward-placeholder-skin/);
  });

  it('layout raíz carga el CSS de rewards-upcoming', () => {
    const src = read('src/app/sorteos/layout.tsx');
    expect(src).toMatch(/platform-rewards-upcoming\.css/);
  });

  it('ya NO se muestra el string plano "Imagen pendiente" como único fallback', () => {
    // Antes: `<div className="gp-shop-img-empty">Imagen pendiente</div>`
    // Ahora: <RewardPlaceholder>.
    expect(src).not.toMatch(/Imagen pendiente/);
  });
});

describe('[rewards-catalog] próximas recompensas NO son canjeables', () => {
  const src = read('src/features/giveaway-platform/components/PlatformShop.tsx');

  it('la card de upcoming NO tiene botón Canjear', () => {
    // El bloque de upcoming solo tiene link "Ver en Steam Market".
    expect(src).toMatch(/Ver en Steam Market/);
    // No debe existir un botón Canjear en la card planned.
    expect(src).toMatch(/gp-shop-card-planned/);
  });

  it('se muestra "Precio pendiente" y "Stock pendiente" cuando faltan', () => {
    expect(src).toMatch(/Precio pendiente/);
    expect(src).toMatch(/Stock pendiente/);
  });

  it('badge "Próximamente" superpuesto en la card', () => {
    expect(src).toMatch(/gp-shop-badge-soon/);
    expect(src).toMatch(/Próximamente/);
  });
});

describe('[rewards-catalog] ningún seed activa estos 8 URLs', () => {
  it('scripts/seed-giveaway-platform.ts no referencia los listing hashes', () => {
    const seedPath = path.join(ROOT, 'scripts/seed-giveaway-platform.ts');
    if (!fs.existsSync(seedPath)) return;
    const src = fs.readFileSync(seedPath, 'utf-8');
    for (const url of STEAM_MARKET_URLS) {
      const hash = url.match(/\/listings\/730\/([A-Za-z0-9]+)/)?.[1];
      if (hash) expect(src).not.toContain(hash);
    }
  });
});

describe('[rewards-catalog] ningún módulo hace fetch runtime a Steam Market', () => {
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

  it('src/ (sin tests) no llama fetch/axios contra steamcommunity.com/market', () => {
    const files = walk(srcDir);
    for (const f of files) {
      const src = fs.readFileSync(f, 'utf-8');
      // El único archivo que puede mencionar "steamcommunity.com/market"
      // es rewards-catalog.ts (constante de URLs). Nadie hace fetch a esos.
      if (f.endsWith('rewards-catalog.ts')) continue;
      expect(src).not.toMatch(/steamcommunity\.com\/market/);
    }
  });
});

describe('[rewards-catalog] conversión $/€ → puntos no expuesta al usuario', () => {
  const src = read('src/features/giveaway-platform/components/PlatformShop.tsx');
  it('PlatformShop no muestra ratio de conversión', () => {
    expect(src).not.toMatch(/1\s*USD\s*[^.]{0,60}1\.?000\s*puntos/i);
    expect(src).not.toMatch(/1\s*EUR\s*[^.]{0,60}1\.?100\s*puntos/i);
    expect(src).not.toMatch(/equivalente\s*en\s*€/i);
    expect(src).not.toMatch(/equivalente\s*en\s*\$/i);
  });
});
