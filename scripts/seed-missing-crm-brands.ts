/**
 * Inserta marcas faltantes en crm_brands y corrige nombres inconsistentes,
 * para que el backfill de crmBrandId pueda mapear todos los registros históricos.
 *
 * Uso:
 *   npx tsx scripts/seed-missing-crm-brands.ts
 *
 * Idempotente: usa INSERT ... ON CONFLICT DO NOTHING para las nuevas marcas
 * y solo renombra si el nombre actual es exactamente el que se espera corregir.
 */

import { config as dotenvConfig } from 'dotenv';
import { join } from 'path';
dotenvConfig({ path: join(process.cwd(), '.env.local') });

import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { eq } from 'drizzle-orm';
import * as schema from '../src/db/schema/index';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL no configurado.');
  process.exit(1);
}

const db = drizzle(neon(DATABASE_URL), { schema });

async function run(): Promise<void> {
  // 1. Renombrar marcas con nombre inconsistente
  const renames: { from: string; to: string }[] = [
    { from: 'SkinClub',   to: 'Skin Club'   },
    { from: 'EmpireDrop', to: 'Empire Drop' },
  ];

  for (const { from, to } of renames) {
    const existing = await db
      .select({ id: schema.crmBrands.id, name: schema.crmBrands.name })
      .from(schema.crmBrands)
      .where(eq(schema.crmBrands.name, from));

    if (existing.length > 0) {
      await db.update(schema.crmBrands)
        .set({ name: to, updatedAt: new Date() })
        .where(eq(schema.crmBrands.name, from));
      console.log(`  ✓ Renombrado: "${from}" → "${to}" (id=${existing[0].id})`);
    } else {
      console.log(`  — Sin cambio: "${from}" no encontrado (ya renombrado o no existe)`);
    }
  }

  // 2. Insertar marcas faltantes (idempotente por nombre)
  const toInsert = [
    { name: 'KeyDrop',  category: 'Gaming / CS2', mainUrl: 'https://key.drop' },
    { name: 'Skinplace', category: 'Gaming / CS2', mainUrl: null },
    { name: '1xBET',    category: 'Apuestas',      mainUrl: 'https://1xbet.com' },
    { name: 'YoCasino', category: 'Casino',         mainUrl: null },
  ];

  for (const brand of toInsert) {
    const existing = await db
      .select({ id: schema.crmBrands.id })
      .from(schema.crmBrands)
      .where(eq(schema.crmBrands.name, brand.name));

    if (existing.length > 0) {
      console.log(`  — Ya existe: "${brand.name}" (id=${existing[0].id})`);
      continue;
    }

    const [inserted] = await db.insert(schema.crmBrands).values({
      name: brand.name,
      category: brand.category,
      mainUrl: brand.mainUrl ?? undefined,
      status: 'activa',
    }).returning({ id: schema.crmBrands.id });

    console.log(`  ✓ Creada: "${brand.name}" (id=${inserted.id})`);
  }

  console.log('\nListo.');
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
