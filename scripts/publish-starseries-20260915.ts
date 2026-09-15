/** One approved web article. No emails, scheduling, schema changes or bulk processing. */
import { readFile } from 'node:fs/promises';
import { and, eq, sql } from 'drizzle-orm';
import { db } from '../src/lib/db';
import { posts } from '../src/db/schema/posts';
import { PostCreateSchema } from '../src/lib/schemas/posts';
import { isPressOutreach } from '../src/lib/content-channel';

async function main(): Promise<void> {
  if (!process.argv.includes('--publish-starseries-20260915')) {
    throw new Error('Explicit publication flag required');
  }
  const input: unknown = JSON.parse(await readFile('content/editorial/starseries-barcelona-2026.json', 'utf8'));
  const parsed = PostCreateSchema.safeParse(input);
  if (!parsed.success) throw new Error('Article payload is invalid');
  const data = parsed.data;
  if (data.slug !== 'starseries-barcelona-2026-cs2-fechas-equipos-formato'
    || data.status !== 'published' || data.vertical !== 'news' || isPressOutreach(data)
    || data.coverUrl !== 'https://socialpro.es/images/news/starseries-barcelona-2026.png') {
    throw new Error('Article is outside approved scope');
  }
  const outcome = await db.transaction(async (tx) => {
    const target = await tx.execute<{ database: string }>(sql`select current_database() as database`);
    if (target.rows[0]?.database !== 'socialpro') throw new Error('Unexpected database destination');
    const inserted = await tx.insert(posts).values({
      ...data, publishedAt: new Date(), coverUrl: data.coverUrl,
      ogImageUrl: data.ogImageUrl ?? data.coverUrl,
    }).onConflictDoNothing({ target: posts.slug }).returning({ id: posts.id });
    const [saved] = await tx.select().from(posts).where(and(eq(posts.slug, data.slug), eq(posts.status, 'published'))).limit(1);
    if (!saved || saved.title !== data.title || saved.bodyMd !== data.bodyMd || saved.excerpt !== data.excerpt
      || saved.vertical !== 'news' || saved.coverUrl !== data.coverUrl || isPressOutreach(saved)) {
      throw new Error('Existing article differs; no overwrite performed');
    }
    return { id: saved.id, slug: saved.slug, publishedAt: saved.publishedAt, created: inserted.length === 1 };
  });
  console.log(JSON.stringify({ ...outcome, newsletterSent: false }));
}

main().catch(() => {
  console.error('Article publication failed; transaction rolled back. No credentials logged.');
  process.exitCode = 1;
});
