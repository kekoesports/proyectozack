/**
 * RUTA TEMPORAL — borrar después de ejecutar.
 * GET  → previsualiza posts afectados (sin modificar nada)
 * POST → aplica la normalización
 */
import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { posts } from '@/db/schema';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

const CANON: Record<string, string> = {
  'pgl astana 2026': 'pgl-astana-2026',
  'gentle-mates':    'gentlemates',
};

function normalize(tags: string[]): { tags: string[]; changed: boolean } {
  const seen = new Set<string>();
  const result: string[] = [];
  let changed = false;
  for (const t of tags) {
    const canonical = CANON[t] ?? t;
    if (canonical !== t) changed = true;
    if (!seen.has(canonical)) { seen.add(canonical); result.push(canonical); }
    else changed = true;
  }
  return { tags: result, changed };
}

async function guardAdmin(): Promise<boolean> {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user?.role === 'admin';
}

export async function GET(): Promise<NextResponse> {
  if (!(await guardAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const rows = await db
    .select({ id: posts.id, slug: posts.slug, tags: posts.tags })
    .from(posts)
    .where(eq(posts.vertical, 'news'));

  const affected = rows
    .filter((r) => normalize(r.tags ?? []).changed)
    .map((r) => {
      const { tags: next } = normalize(r.tags ?? []);
      return { slug: r.slug, before: r.tags, after: next };
    });

  return NextResponse.json({ total: rows.length, affected: affected.length, preview: affected });
}

export async function POST(): Promise<NextResponse> {
  if (!(await guardAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const rows = await db
    .select({ id: posts.id, slug: posts.slug, tags: posts.tags })
    .from(posts)
    .where(eq(posts.vertical, 'news'));

  let updated = 0;
  const log: { slug: string; before: string[]; after: string[] }[] = [];
  for (const row of rows) {
    const { tags: normalizedTags, changed } = normalize(row.tags ?? []);
    if (!changed) continue;
    await db.update(posts).set({ tags: normalizedTags }).where(eq(posts.id, row.id));
    log.push({ slug: row.slug, before: row.tags ?? [], after: normalizedTags });
    updated++;
  }

  return NextResponse.json({ ok: true, updated, log });
}
