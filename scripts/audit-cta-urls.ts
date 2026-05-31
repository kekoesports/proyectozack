/**
 * audit-cta-urls.ts
 * Audita redirectUrl en creator_codes y giveaways para detectar:
 *  - URLs de imagen usadas como destino de navegación (imgur, CDN images, extensiones de imagen)
 *  - redirectUrl null o vacío
 *  - Muestra mainUrl del crm_brand relacionado como posible fallback
 *
 * Uso:
 *   npx tsx scripts/audit-cta-urls.ts
 */

import { config as dotenvConfig } from 'dotenv';
import { join } from 'path';
dotenvConfig({ path: join(process.cwd(), '.env.local') });

import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from '../src/db/schema/index';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL no configurado. Añádelo a .env.local primero.');
  process.exit(1);
}

const db = drizzle(neon(DATABASE_URL), { schema });

// ─────────────────────────────────────────────────────────────────────────────
// Detectores
// ─────────────────────────────────────────────────────────────────────────────

const IMAGE_HOSTNAMES = [
  'imgur.com',
  'i.imgur.com',
  'cdn.discordapp.com',
  'i.redd.it',
  'preview.redd.it',
  'media.discordapp.net',
  'pbs.twimg.com',           // Twitter media
  'cdn.cloudflare.steamstatic.com',
  'steamcdn-a.akamaihd.net',
];

const IMAGE_EXTENSIONS = /\.(png|jpg|jpeg|gif|webp|svg|bmp|avif|ico)(\?.*)?$/i;

function classifyUrl(url: string | null): { type: 'image' | 'empty' | 'ok'; reason: string } {
  if (!url || url.trim() === '') {
    return { type: 'empty', reason: 'null/vacío' };
  }

  const lower = url.toLowerCase();

  // Check hostname
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.replace(/^www\./, '');
    if (IMAGE_HOSTNAMES.some((h) => hostname === h || hostname.endsWith('.' + h))) {
      return { type: 'image', reason: `hostname imagen: ${hostname}` };
    }
  } catch {
    // not a valid URL — could be a relative path or junk
    return { type: 'image', reason: 'URL inválida/relativa' };
  }

  // Check extension in pathname
  if (IMAGE_EXTENSIONS.test(lower)) {
    return { type: 'image', reason: `extensión imagen detectada` };
  }

  return { type: 'ok', reason: '' };
}

function pad(s: string | null | undefined, len: number): string {
  const str = (s ?? '').toString();
  if (str.length >= len) return str.substring(0, len - 1) + '…';
  return str.padEnd(len, ' ');
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────

async function audit(): Promise<void> {
  // 1. Cargar crm_brands
  const crmBrandRows = await db
    .select({
      id: schema.crmBrands.id,
      name: schema.crmBrands.name,
      logoUrl: schema.crmBrands.logoUrl,
      mainUrl: schema.crmBrands.mainUrl,
    })
    .from(schema.crmBrands);

  const brandById = new Map(crmBrandRows.map((b) => [b.id, b]));

  // 2. Cargar creator_codes
  const codes = await db
    .select({
      id: schema.creatorCodes.id,
      talentId: schema.creatorCodes.talentId,
      brandName: schema.creatorCodes.brandName,
      redirectUrl: schema.creatorCodes.redirectUrl,
      brandLogo: schema.creatorCodes.brandLogo,
      crmBrandId: schema.creatorCodes.crmBrandId,
      isFeatured: schema.creatorCodes.isFeatured,
    })
    .from(schema.creatorCodes);

  // 3. Cargar giveaways
  const giveaways = await db
    .select({
      id: schema.giveaways.id,
      talentId: schema.giveaways.talentId,
      brandName: schema.giveaways.brandName,
      redirectUrl: schema.giveaways.redirectUrl,
      brandLogo: schema.giveaways.brandLogo,
      crmBrandId: schema.giveaways.crmBrandId,
      isFeatured: schema.giveaways.isFeatured,
    })
    .from(schema.giveaways);

  // ───────────────────────────────────────────────────────────────────────────
  // Sección: creator_codes
  // ───────────────────────────────────────────────────────────────────────────

  console.log('');
  console.log('══════════════════════════════════════════════════════════════════════════════════════════');
  console.log('  CREATOR CODES — Auditoría redirectUrl');
  console.log(`  Total: ${codes.length} registros`);
  console.log('══════════════════════════════════════════════════════════════════════════════════════════');

  const problemCodes = codes.filter((r) => classifyUrl(r.redirectUrl).type !== 'ok');
  const okCodes = codes.filter((r) => classifyUrl(r.redirectUrl).type === 'ok');

  console.log(`  OK: ${okCodes.length}  |  Problemas: ${problemCodes.length}`);
  console.log('');

  if (problemCodes.length > 0) {
    console.log('  ┌──────┬──────────────────────┬──────────────────────────────────────────────────────┬────────────────────────────────────────────┬──────────────────┐');
    console.log('  │  ID  │ brandName            │ redirectUrl                                          │ crmBrand mainUrl (fallback)                │ problema         │');
    console.log('  ├──────┼──────────────────────┼──────────────────────────────────────────────────────┼────────────────────────────────────────────┼──────────────────┤');
    for (const row of problemCodes) {
      const cls = classifyUrl(row.redirectUrl);
      const crmBrand = row.crmBrandId ? brandById.get(row.crmBrandId) : undefined;
      const mainUrl = crmBrand?.mainUrl ?? '—';
      console.log(
        `  │ ${pad(String(row.id), 5)}│ ${pad(row.brandName, 21)}│ ${pad(row.redirectUrl, 53)}│ ${pad(mainUrl, 43)}│ ${pad(cls.reason, 17)}│`
      );
    }
    console.log('  └──────┴──────────────────────┴──────────────────────────────────────────────────────┴────────────────────────────────────────────┴──────────────────┘');
  } else {
    console.log('  ✓  No se encontraron problemas en creator_codes.');
  }

  console.log('');
  console.log('  Todos los creator_codes (resumen completo):');
  console.log('  ┌──────┬──────────────────────┬────────────┬──────────────────────────────────────────────────────┬──────────────────────────────────────┬──────────┐');
  console.log('  │  ID  │ brandName            │ crmBrandId │ redirectUrl                                          │ brandLogo                            │ featured │');
  console.log('  ├──────┼──────────────────────┼────────────┼──────────────────────────────────────────────────────┼──────────────────────────────────────┼──────────┤');
  for (const row of codes) {
    const cls = classifyUrl(row.redirectUrl);
    const flag = cls.type === 'ok' ? '  ' : cls.type === 'empty' ? '⚠ ' : '🚨';
    console.log(
      `  │ ${pad(String(row.id), 5)}│ ${pad(row.brandName, 21)}│ ${pad(row.crmBrandId != null ? String(row.crmBrandId) : '—', 11)}│ ${flag}${pad(row.redirectUrl, 51)}│ ${pad(row.brandLogo, 37)}│ ${row.isFeatured ? 'YES      ' : 'no       '}│`
    );
  }
  console.log('  └──────┴──────────────────────┴────────────┴──────────────────────────────────────────────────────┴──────────────────────────────────────┴──────────┘');

  // ───────────────────────────────────────────────────────────────────────────
  // Sección: giveaways
  // ───────────────────────────────────────────────────────────────────────────

  console.log('');
  console.log('══════════════════════════════════════════════════════════════════════════════════════════');
  console.log('  GIVEAWAYS — Auditoría redirectUrl');
  console.log(`  Total: ${giveaways.length} registros`);
  console.log('══════════════════════════════════════════════════════════════════════════════════════════');

  const problemGiveaways = giveaways.filter((r) => classifyUrl(r.redirectUrl).type !== 'ok');
  const okGiveaways = giveaways.filter((r) => classifyUrl(r.redirectUrl).type === 'ok');

  console.log(`  OK: ${okGiveaways.length}  |  Problemas: ${problemGiveaways.length}`);
  console.log('');

  if (problemGiveaways.length > 0) {
    console.log('  ┌──────┬──────────────────────┬──────────────────────────────────────────────────────┬────────────────────────────────────────────┬──────────────────┐');
    console.log('  │  ID  │ brandName            │ redirectUrl                                          │ crmBrand mainUrl (fallback)                │ problema         │');
    console.log('  ├──────┼──────────────────────┼──────────────────────────────────────────────────────┼────────────────────────────────────────────┼──────────────────┤');
    for (const row of problemGiveaways) {
      const cls = classifyUrl(row.redirectUrl);
      const crmBrand = row.crmBrandId ? brandById.get(row.crmBrandId) : undefined;
      const mainUrl = crmBrand?.mainUrl ?? '—';
      console.log(
        `  │ ${pad(String(row.id), 5)}│ ${pad(row.brandName, 21)}│ ${pad(row.redirectUrl, 53)}│ ${pad(mainUrl, 43)}│ ${pad(cls.reason, 17)}│`
      );
    }
    console.log('  └──────┴──────────────────────┴──────────────────────────────────────────────────────┴────────────────────────────────────────────┴──────────────────┘');
  } else {
    console.log('  ✓  No se encontraron problemas en giveaways.');
  }

  console.log('');
  console.log('  Todos los giveaways (resumen completo):');
  console.log('  ┌──────┬──────────────────────┬────────────┬──────────────────────────────────────────────────────┬──────────────────────────────────────┬──────────┐');
  console.log('  │  ID  │ brandName            │ crmBrandId │ redirectUrl                                          │ brandLogo                            │ featured │');
  console.log('  ├──────┼──────────────────────┼────────────┼──────────────────────────────────────────────────────┼──────────────────────────────────────┼──────────┤');
  for (const row of giveaways) {
    const cls = classifyUrl(row.redirectUrl);
    const flag = cls.type === 'ok' ? '  ' : cls.type === 'empty' ? '⚠ ' : '🚨';
    console.log(
      `  │ ${pad(String(row.id), 5)}│ ${pad(row.brandName, 21)}│ ${pad(row.crmBrandId != null ? String(row.crmBrandId) : '—', 11)}│ ${flag}${pad(row.redirectUrl, 51)}│ ${pad(row.brandLogo, 37)}│ ${row.isFeatured ? 'YES      ' : 'no       '}│`
    );
  }
  console.log('  └──────┴──────────────────────┴────────────┴──────────────────────────────────────────────────────┴──────────────────────────────────────┴──────────┘');

  // ───────────────────────────────────────────────────────────────────────────
  // Sección: crm_brands — logoUrl y mainUrl
  // ───────────────────────────────────────────────────────────────────────────

  console.log('');
  console.log('══════════════════════════════════════════════════════════════════════════════════════════');
  console.log('  CRM BRANDS — logoUrl y mainUrl');
  console.log(`  Total: ${crmBrandRows.length} marcas`);
  console.log('══════════════════════════════════════════════════════════════════════════════════════════');

  const brandsWithProblems = crmBrandRows.filter(
    (b) =>
      classifyUrl(b.logoUrl).type === 'image' ||
      classifyUrl(b.mainUrl).type === 'image' ||
      !b.mainUrl
  );

  console.log('');
  console.log('  ┌──────┬──────────────────────────────┬──────────────────────────────────────────────────┬──────────────────────────────────────────────────┐');
  console.log('  │  ID  │ name                         │ logoUrl                                          │ mainUrl                                          │');
  console.log('  ├──────┼──────────────────────────────┼──────────────────────────────────────────────────┼──────────────────────────────────────────────────┤');
  for (const b of crmBrandRows) {
    const logoFlag = classifyUrl(b.logoUrl).type === 'image' ? '🚨' : '  ';
    const mainFlag = !b.mainUrl ? '⚠ ' : classifyUrl(b.mainUrl).type === 'image' ? '🚨' : '  ';
    console.log(
      `  │ ${pad(String(b.id), 5)}│ ${pad(b.name, 29)}│ ${logoFlag}${pad(b.logoUrl, 47)}│ ${mainFlag}${pad(b.mainUrl, 47)}│`
    );
  }
  console.log('  └──────┴──────────────────────────────┴──────────────────────────────────────────────────┴──────────────────────────────────────────────────┘');

  // ───────────────────────────────────────────────────────────────────────────
  // Resumen ejecutivo
  // ───────────────────────────────────────────────────────────────────────────

  const totalProblems = problemCodes.length + problemGiveaways.length;

  console.log('');
  console.log('══════════════════════════════════════════════════════════════════════════════════════════');
  console.log('  RESUMEN EJECUTIVO');
  console.log('══════════════════════════════════════════════════════════════════════════════════════════');
  console.log(`  creator_codes con problema: ${problemCodes.length} / ${codes.length}`);
  console.log(`  giveaways con problema:     ${problemGiveaways.length} / ${giveaways.length}`);
  console.log(`  crm_brands sin mainUrl:     ${crmBrandRows.filter((b) => !b.mainUrl).length} / ${crmBrandRows.length}`);
  console.log(`  Total CTAs problemáticos:   ${totalProblems}`);

  if (totalProblems === 0) {
    console.log('');
    console.log('  ✓  Todos los redirectUrl son URLs de sitios web válidas.');
  } else {
    console.log('');
    console.log('  ACCIÓN RECOMENDADA: Actualizar los redirectUrl problemáticos con URLs de sitios web reales.');
    console.log('  Para cada registro con crmBrandId, el mainUrl del crm_brand es el fallback sugerido.');
  }

  console.log('');

  process.exit(0);
}

audit().catch((err) => {
  console.error(err);
  process.exit(1);
});
