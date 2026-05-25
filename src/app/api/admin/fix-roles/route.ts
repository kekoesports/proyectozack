import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { eq } from 'drizzle-orm';
import * as schema from '@/db/schema/index';

export const runtime = 'nodejs';

const REPLACEMENTS: Array<{ from: string; to: string }> = [
  { from: 'JUGADOR PROFESIONAL DE CS2', to: 'PRO PLAYER CS2' },
];

export async function POST() {
  const db = drizzle(neon(process.env.DATABASE_URL!), { schema });

  const updated: Array<{ name: string; slug: string; field: string; from: string; to: string }> = [];

  for (const { from, to } of REPLACEMENTS) {
    const rows = await db
      .select({ id: schema.talents.id, name: schema.talents.name, slug: schema.talents.slug, role: schema.talents.role, role2: schema.talents.role2 })
      .from(schema.talents);

    for (const row of rows) {
      if (row.role === from) {
        await db.update(schema.talents).set({ role: to }).where(eq(schema.talents.id, row.id));
        updated.push({ name: row.name, slug: row.slug, field: 'role', from, to });
      }
      if (row.role2 === from) {
        await db.update(schema.talents).set({ role2: to }).where(eq(schema.talents.id, row.id));
        updated.push({ name: row.name, slug: row.slug, field: 'role2', from, to });
      }
    }
  }

  return NextResponse.json({ updated: updated.length, changes: updated });
}
