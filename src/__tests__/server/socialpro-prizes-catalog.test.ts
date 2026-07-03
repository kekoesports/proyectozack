/**
 * Contratos estructurales del catálogo de premios SocialPro fase 1.
 *
 * El documento `docs/socialpro-prizes-catalog.md` define 8 skins CS2 como
 * premios "planeados" (sin activar, sin canje, sin seed). Este test
 * verifica que:
 *
 *  - Los 8 URLs de Steam Market están en el documento (fuente de verdad).
 *  - Cada premio queda como `planned` / `is_active: false`.
 *  - Ningún seed script inserta estos 8 URLs.
 *  - Ningún módulo de `src/` hace fetch runtime a `steamcommunity.com/market`.
 *  - La regla de conversión coste → puntos NO aparece en ningún componente UI
 *    (solo en el .md).
 *
 * Objetivo: bloquear activación accidental de premios sin OK explícito.
 */

import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '..', '..', '..');
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf-8');

// Los 8 URLs canónicos de la fase 1. Si esta constante cambia, la tabla
// del documento tiene que reflejarlo — el test lo enforce.
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

const DOC_PATH = 'docs/socialpro-prizes-catalog.md';

describe('[prizes-catalog] documento existe con la fase 1 documentada', () => {
  it('docs/socialpro-prizes-catalog.md existe y no está vacío', () => {
    const p = path.join(ROOT, DOC_PATH);
    expect(fs.existsSync(p)).toBe(true);
    expect(fs.statSync(p).size).toBeGreaterThan(2000);
  });

  it('contiene un marcador de fase 1 explícito', () => {
    const doc = read(DOC_PATH);
    expect(doc).toMatch(/Fase 1\s*—\s*Skins CS2/);
  });
});

describe('[prizes-catalog] los 8 URLs de Steam Market están presentes', () => {
  const doc = read(DOC_PATH);
  for (const url of STEAM_MARKET_URLS) {
    it(`URL presente: ${url.slice(0, 80)}...`, () => {
      expect(doc).toContain(url);
    });
  }

  it('no falta ni sobra ninguna URL (exactamente 8 listings)', () => {
    const matches = doc.match(/https:\/\/steamcommunity\.com\/market\/listings\/730\/[A-Za-z0-9]+/g) ?? [];
    // Cada URL puede repetirse en tabla — el conjunto único de listings
    // debe ser exactamente 8.
    const unique = new Set(matches.map((u) => u.split('?')[0]));
    expect(unique.size).toBe(8);
  });
});

describe('[prizes-catalog] estado inicial correcto (planned / is_active false)', () => {
  const doc = read(DOC_PATH);

  it('todos los premios se marcan status: planned', () => {
    // Metadata YAML en el bloque común.
    expect(doc).toMatch(/status:\s*planned/);
    // Y en la tabla — buscamos al menos 8 celdas "planned" (con espacios de
    // padding de columna markdown).
    const cells = (doc.match(/\|\s*planned\s*\|/g) ?? []).length;
    expect(cells).toBeGreaterThanOrEqual(8);
  });

  it('todos los premios se marcan is_active: false', () => {
    expect(doc).toMatch(/is_active:\s*false/);
    const cells = (doc.match(/\|\s*false\s*\|/g) ?? []).length;
    expect(cells).toBeGreaterThanOrEqual(8);
  });

  it('cada premio tiene suggested_coin_price: pending (no precio hardcoded)', () => {
    expect(doc).toMatch(/suggested_coin_price:\s*pending/);
    const cells = (doc.match(/\|\s*pending\s*\|/g) ?? []).length;
    expect(cells).toBeGreaterThanOrEqual(8);
  });

  it('metadata común declara source=steam_market + category=skin + game=CS2', () => {
    expect(doc).toMatch(/source:\s*steam_market/);
    expect(doc).toMatch(/category:\s*skin/);
    expect(doc).toMatch(/game:\s*CS2/);
  });
});

describe('[prizes-catalog] no hay seed que active estos premios', () => {
  it('ningún script en scripts/ referencia los 8 URLs', () => {
    // Recorremos scripts/ y verificamos que ningún .ts/.js contenga los
    // hashes únicos de listing (G1804208D0B3004, etc.). Esto atrapa cualquier
    // seed que intente cargar el catálogo sin OK explícito.
    const scriptsDir = path.join(ROOT, 'scripts');
    if (!fs.existsSync(scriptsDir)) return; // No scripts dir → nada que verificar.
    const files = fs.readdirSync(scriptsDir).filter((f) => /\.(ts|js|mjs)$/.test(f));
    for (const f of files) {
      const src = fs.readFileSync(path.join(scriptsDir, f), 'utf-8');
      for (const url of STEAM_MARKET_URLS) {
        const listingHash = url.match(/\/listings\/730\/([A-Za-z0-9]+)/)?.[1];
        if (listingHash) {
          expect(src).not.toContain(listingHash);
        }
      }
    }
  });

  it('src/ no referencia los URLs canónicos de Steam Market (ni en constants ni en seeds)', () => {
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
    const files = walk(srcDir);
    for (const url of STEAM_MARKET_URLS) {
      const listingHash = url.match(/\/listings\/730\/([A-Za-z0-9]+)/)?.[1];
      if (!listingHash) continue;
      const hits = files.filter((f) => fs.readFileSync(f, 'utf-8').includes(listingHash));
      // Cero hits en src/ non-test. La fuente de verdad está en el .md.
      expect(hits).toHaveLength(0);
    }
  });
});

describe('[prizes-catalog] no hay scraping runtime de Steam Market', () => {
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

  it('ningún archivo en src/ hace fetch a steamcommunity.com/market', () => {
    const files = walk(srcDir);
    for (const f of files) {
      const src = fs.readFileSync(f, 'utf-8');
      // Detectamos cualquier concatenación con la URL de Steam Market en
      // contexto de fetch — no basta con importar la constante en el .md,
      // eso ya lo verificamos aparte.
      expect(src).not.toMatch(/steamcommunity\.com\/market/);
    }
  });
});

describe('[prizes-catalog] regla de conversión coste→puntos queda solo en el .md', () => {
  const doc = read(DOC_PATH);

  it('la regla 1 USD ≈ 1.000 puntos está documentada en el .md', () => {
    expect(doc).toMatch(/1\s*USD\s*coste\s*interno\s*≈\s*1_?000\s*puntos/);
    expect(doc).toMatch(/1\s*EUR\s*coste\s*interno\s*≈\s*1_?100\s*puntos/);
  });

  it('la regla NO aparece en el componente PlatformShop ni en la tienda pública', () => {
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
    const files = walk(srcDir);
    for (const f of files) {
      const src = fs.readFileSync(f, 'utf-8');
      expect(src).not.toMatch(/1\s*USD\s*[^.]{0,40}1_?000\s*puntos/);
      expect(src).not.toMatch(/1\s*EUR\s*[^.]{0,40}1_?100\s*puntos/);
    }
  });
});

describe('[prizes-catalog] soporte futuro documentado (skins, gift cards, merch, etc.)', () => {
  const doc = read(DOC_PATH);
  const futureCategories = ['skin', 'gift_card', 'merch', 'profile_card', 'avatar_frame', 'badge'] as const;

  for (const cat of futureCategories) {
    it(`categoría "${cat}" documentada en la tabla de categorías soportadas`, () => {
      expect(doc).toMatch(new RegExp(`\`${cat}\``));
    });
  }
});
