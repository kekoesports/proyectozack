/**
 * Seed de clientes de facturación — idempotente.
 * Uso: npx tsx scripts/seed-billing-clients.ts
 */
import { config } from 'dotenv';
import { resolve } from 'node:path';
config({ path: resolve(process.cwd(), '.env.local') });

import { neon }    from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { eq, ilike } from 'drizzle-orm';
import * as schema from '../src/db/schema/index';

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) { console.error('DATABASE_URL no encontrado en .env.local'); process.exit(1); }

const db = drizzle(neon(dbUrl), { schema });
const { billingClients, crmBrands } = schema;

async function findBrand(search: string): Promise<number | null> {
  const [row] = await db.select({ id: crmBrands.id, name: crmBrands.name })
    .from(crmBrands).where(ilike(crmBrands.name, `%${search}%`)).limit(1);
  if (row) console.log(`  ✓ Marca: "${row.name}" (id=${row.id})`);
  else     console.warn(`  ⚠ Marca no encontrada: "${search}"`);
  return row?.id ?? null;
}

const CLIENTS = [
  {
    name:        'STARK INDUSTRIES SL',
    legalName:   'STARK INDUSTRIES SL',
    taxId:       'L-714538-S',
    notes:       'Marca: STARK',
    country:     'Andorra',
    city:        'Escaldes-Engordany',
    postalCode:  'AD700',
    address:     'Carrer Prat de Roget 2, 1ª 23',
    type:        'empresa_fuera_ue',
    brandSearch: null,
  },
  {
    name:        'Almiron Management SL',
    legalName:   'Almiron Management SL',
    taxId:       'B19397652',
    notes:       'Marca: MARTIN',
    country:     'España',
    city:        'Barcelona',
    postalCode:  '08015',
    address:     'Carrer Gran Via de les Corts Catalanes 490 ent 3',
    type:        'empresa_espana',
    brandSearch: null,
  },
  {
    name:        'GVANTAGEWeb Limited',
    legalName:   'GVANTAGEWeb Limited',
    taxId:       '77210270',
    notes:       null,
    country:     'Hong Kong',
    city:        'Central',
    postalCode:  null,
    address:     'Suite C, Level 7, World Trust Tower, 50 Stanley Street',
    type:        'empresa_fuera_ue',
    brandSearch: 'KEYDROP',
  },
  {
    name:        'Moontain Limited',
    legalName:   'Moontain Limited',
    taxId:       'CY10410299R',
    vatNumber:   'CY10410299R',
    notes:       null,
    country:     'Cyprus',
    city:        'Nicosia',
    postalCode:  '1061',
    address:     '13 Kyprianoros Street, Office 205',
    type:        'empresa_ue',
    brandSearch: 'SKIN CLUB',
  },
  {
    name:        'BinaryLore Pte. Limited',
    legalName:   'BinaryLore Pte. Limited',
    taxId:       '202040562G',
    notes:       null,
    country:     'Singapore',
    city:        'Singapore',
    postalCode:  '098018',
    address:     '13 Keppel Bay Drive, #01-25, Corals at Keppel Bay',
    type:        'empresa_fuera_ue',
    brandSearch: 'SKINPLACE',
  },
  {
    name:        'MOLTEON PTE. Limited',
    legalName:   'MOLTEON PTE. Limited',
    taxId:       '202040309TD',
    notes:       null,
    country:     'Singapore',
    city:        'Singapore',
    postalCode:  '098018',
    address:     '13 Keppel Bay Drive, #01-25, Corals at Keppel Bay',
    type:        'empresa_fuera_ue',
    brandSearch: 'HELLCASE',
  },
  {
    name:        'INVENTA VENTURES LLC',
    legalName:   'INVENTA VENTURES LLC',
    taxId:       '0557663',
    notes:       null,
    country:     'USA',
    city:        'Newark',
    postalCode:  '19713',
    address:     '2915 Ogletown Road, #4087',
    type:        'empresa_fuera_ue',
    brandSearch: 'W88',
  },
];

async function main(): Promise<void> {
  console.log('=== Seed billing clients ===\n');

  const existing = await db.select({ id: billingClients.id, taxId: billingClients.taxId })
    .from(billingClients);
  const existingMap = new Map(existing.map((r) => [r.taxId, r.id]));

  for (const c of CLIENTS) {
    console.log(`\n→ ${c.name}`);

    if (existingMap.has(c.taxId)) {
      // Ya existe — actualizar notes si hace falta
      if (c.notes) {
        await db.update(billingClients)
          .set({ notes: c.notes })
          .where(eq(billingClients.taxId, c.taxId));
        console.log(`  ↳ Ya existía — notes actualizado: "${c.notes}"`);
      } else {
        console.log('  ↳ Ya existe — skip');
      }
      continue;
    }

    const brandId = c.brandSearch ? await findBrand(c.brandSearch) : null;

    await db.insert(billingClients).values({
      name:                   c.name,
      legalName:              c.legalName,
      taxId:                  c.taxId,
      vatNumber:              'vatNumber' in c ? (c as { vatNumber?: string }).vatNumber ?? null : null,
      country:                c.country,
      city:                   c.city,
      postalCode:             c.postalCode ?? null,
      address:                c.address,
      type:                   c.type,
      defaultVatRate:         '0',
      defaultWithholdingRate: '0',
      relatedBrandId:         brandId,
      email:                  null,
      notes:                  c.notes ?? null,
    });
    console.log('  ✓ Creado');
  }

  console.log('\n=== Completado ===');
  process.exit(0);
}

main().catch((err: unknown) => { console.error('Error:', err); process.exit(1); });
