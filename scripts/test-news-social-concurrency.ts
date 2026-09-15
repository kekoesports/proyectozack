/** Multi-connection locking test; requires the explicitly isolated localhost PostgreSQL fixture. */
import assert from 'node:assert/strict';
import { Pool } from 'pg';
import { generateDrizzleJson, generateMigration } from 'drizzle-kit/api';
import { eq } from 'drizzle-orm';
import { db, closeDbPool } from '../src/lib/db';
import { env } from '../src/lib/env';
import { newsSocialChannels, newsSocialDeliveries, posts } from '../src/db/schema';
import { postStatusEnum, postVerticalEnum, postContentTypeEnum } from '../src/db/schema/posts';
import { activateSocialChannel, beginSocialPublish, claimSocialDelivery, enqueueSocialNews } from '../src/lib/news-social/repository';
import { budgetMonth } from '../src/lib/news-social/policy';

async function main() {
  assert.equal(env.DATABASE_URL, 'postgresql://fixture:fixture@127.0.0.1:15460/news_social_concurrency_fixture');
  assert.ok(env.DB_POOL_MAX >= 4);
  const pool = new Pool({ connectionString: env.DATABASE_URL });
  try {
    const target = await pool.query<{ database: string; count: number }>(`select current_database() as database, (select count(*)::int from information_schema.tables where table_schema='public') as count`);
    assert.equal(target.rows[0]?.database, 'news_social_concurrency_fixture');
    assert.equal(target.rows[0]?.count, 0, 'Must be empty disposable fixture');
    for (const statement of await generateMigration(generateDrizzleJson({}), generateDrizzleJson({ posts, postStatusEnum, postVerticalEnum, postContentTypeEnum, newsSocialChannels, newsSocialDeliveries }))) await pool.query(statement);
    const now = new Date(); const start = new Date(now.getTime() - 60_000);
    await activateSocialChannel('x', 'fixture', 'fixture-fingerprint', start);
    const [post] = await db.insert(posts).values({ slug: 'concurrency-fixture', title: 'TEST', excerpt: 'TEST', bodyMd: 'TEST', vertical: 'news', status: 'published', publishedAt: now }).returning();
    assert.ok(post);
    await Promise.all(Array.from({ length: 8 }, () => enqueueSocialNews('x', now)));
    assert.equal((await db.select().from(newsSocialDeliveries)).length, 1);
    const claims = await Promise.all(Array.from({ length: 8 }, () => claimSocialDelivery('x', now)));
    assert.equal(claims.filter(Boolean).length, 1);
    const one = claims.find(Boolean); assert.ok(one);
    const sends = await Promise.all(Array.from({ length: 8 }, () => beginSocialPublish(one.delivery.id, 'x', 'fixture-fingerprint', now)));
    assert.equal(sends.filter(Boolean).length, 1);
    const [config] = await db.select().from(newsSocialChannels).where(eq(newsSocialChannels.channel, 'x')); assert.equal(config?.reservedCents, 20);
    await db.update(newsSocialDeliveries).set({ status: 'published' }).where(eq(newsSocialDeliveries.id, one.delivery.id));
    await db.insert(posts).values([1, 2].map(n => ({ slug: `budget-fixture-${n}`, title: 'TEST', excerpt: 'TEST', bodyMd: 'TEST', vertical: 'news' as const, status: 'published' as const, publishedAt: now })));
    await enqueueSocialNews('x', now);
    const remaining = await Promise.all([claimSocialDelivery('x', now), claimSocialDelivery('x', now)]);
    assert.equal(remaining.filter(Boolean).length, 2);
    await db.update(newsSocialChannels).set({ budgetMonth: budgetMonth(now), reservedCents: 380 }).where(eq(newsSocialChannels.channel, 'x'));
    const lastSlot = await Promise.all(remaining.map(row => { assert.ok(row); return beginSocialPublish(row.delivery.id, 'x', 'fixture-fingerprint', now); }));
    assert.equal(lastSlot.filter(Boolean).length, 1);
    const [capped] = await db.select().from(newsSocialChannels).where(eq(newsSocialChannels.channel, 'x')); assert.equal(capped?.reservedCents, 400);
    console.log(JSON.stringify({ database: 'disposable PostgreSQL', parallelClaims: 8, singleDelivery: true, singleSend: true, concurrentBudgetCap: true, providerCalls: 0 }));
  } finally { await closeDbPool(); await pool.end(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
