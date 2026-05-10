/**
 * process-thumbs — pipeline de thumbnails editoriales para /news.
 *
 * Toma una imagen compuesta (grid 2×2 de thumbnails) y para cada cuadrante
 * produce las variantes que consume la web:
 *   - cover-1600x900.jpg   → hero featured + detail
 *   - thumb-800x500.jpg    → NewsCard grid + trending sidebar
 *   - og-1200x630.jpg      → OpenGraph + Twitter card (fit contain con bg)
 *
 * Salida: public/images/news/<slug>/{cover,thumb,og}-...jpg
 *
 * Reutilizable: para nuevos packs cambiar SOURCE + GRID_LAYOUT.
 *
 * Uso: npx tsx scripts/seeds/news/process-thumbs.ts
 */
import sharp from 'sharp';
import { mkdir } from 'fs/promises';
import { join } from 'path';

type Quadrant = {
  readonly slug: string;
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
};

const SOURCE = '.scratch/news/source-thumbs.png';
const PUBLIC_DIR = 'public/images/news';

// Source es 1536×1024, grid 2×2 con gap visible entre cuadrantes.
// Quito 4-6px de cada lado interior para no incluir el gap como borde.
const QUADRANTS: readonly Quadrant[] = [
  // Top-left: BLAST PREMIER SPRING FINAL 2024
  {
    slug: 'blast-premier-spring-final-2024',
    left: 4,
    top: 4,
    width: 760,
    height: 504,
  },
  // Top-right: TOP 5 PICKS DE LA SEMANA
  {
    slug: 'top-5-picks-semana-cs2',
    left: 772,
    top: 4,
    width: 760,
    height: 504,
  },
  // Bottom-left: META ACTUAL DE CS2
  {
    slug: 'meta-cs2-mapas-armas-tendencias',
    left: 4,
    top: 516,
    width: 760,
    height: 504,
  },
  // Bottom-right: EQUIPOS TIER 2 A SEGUIR
  {
    slug: 'equipos-tier-2-cs2-seguir',
    left: 772,
    top: 516,
    width: 760,
    height: 504,
  },
];

const BG = { r: 14, g: 14, b: 14, alpha: 1 };

async function processQuadrant(q: Quadrant): Promise<void> {
  const outDir = join(PUBLIC_DIR, q.slug);
  await mkdir(outDir, { recursive: true });

  // Source crop a buffer — base de las 3 variantes.
  const baseBuf = await sharp(SOURCE)
    .extract({ left: q.left, top: q.top, width: q.width, height: q.height })
    .toBuffer();

  // 1) cover-1600x900 (16:9, fit cover) — hero + detail header
  await sharp(baseBuf)
    .resize(1600, 900, { fit: 'cover', position: 'center' })
    .jpeg({ quality: 88, mozjpeg: true })
    .toFile(join(outDir, 'cover-1600x900.jpg'));

  // 2) thumb-800x500 (16:10, fit cover) — grid + trending
  await sharp(baseBuf)
    .resize(800, 500, { fit: 'cover', position: 'center' })
    .jpeg({ quality: 86, mozjpeg: true })
    .toFile(join(outDir, 'thumb-800x500.jpg'));

  // 3) og-1200x630 (fit contain) — preserva composición completa con
  //    background sp-black para evitar cortar título/visual.
  await sharp(baseBuf)
    .resize(1200, 630, { fit: 'contain', background: BG })
    .jpeg({ quality: 90, mozjpeg: true })
    .toFile(join(outDir, 'og-1200x630.jpg'));

  console.log(`  ✓ ${q.slug}`);
}

async function main(): Promise<void> {
  console.log(`Processing ${QUADRANTS.length} thumbnails from ${SOURCE}...`);
  for (const q of QUADRANTS) {
    await processQuadrant(q);
  }
  console.log('Done.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
