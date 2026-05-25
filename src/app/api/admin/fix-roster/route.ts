import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { eq, and, not } from 'drizzle-orm';
import * as schema from '@/db/schema/index';

export const runtime = 'nodejs';

export async function POST() {
  const db = drizzle(neon(process.env.DATABASE_URL!), { schema });

  // 1. Estado actual de todos los talentos
  const all = await db
    .select({
      id: schema.talents.id,
      name: schema.talents.name,
      slug: schema.talents.slug,
      isPublished: schema.talents.isPublished,
      showInRoster: schema.talents.showInRoster,
    })
    .from(schema.talents)
    .orderBy(schema.talents.sortOrder);

  // 2. Publicados pero NO en roster → corregir
  const toFix = all.filter((t) => t.isPublished && !t.showInRoster);

  for (const t of toFix) {
    await db
      .update(schema.talents)
      .set({ showInRoster: true })
      .where(eq(schema.talents.id, t.id));
  }

  const report = all.map((t) => ({
    name: t.name,
    slug: t.slug,
    wasPublished: t.isPublished,
    wasInRoster: t.showInRoster,
    fixed: toFix.some((f) => f.id === t.id),
  }));

  return NextResponse.json({ fixed: toFix.length, report });
}
