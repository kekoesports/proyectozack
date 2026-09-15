/** Isolated PostgreSQL fixture. Provider HTTP is replaced; no real accounts or public posts. */
import assert from 'node:assert/strict';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { PGLiteSocketServer } from '@electric-sql/pglite-socket';
import { generateDrizzleJson, generateMigration, upPgSnapshot } from 'drizzle-kit/api';
import { eq } from 'drizzle-orm';
import baseline from '../drizzle/meta/0164_snapshot.json';
import expected from '../drizzle/meta/0165_snapshot.json';
import * as schema from '../src/db/schema';
import { db, closeDbPool } from '../src/lib/db';
import { env } from '../src/lib/env';
import { activateSocialChannel, beginSocialPublish, claimSocialDelivery, enqueueSocialNews, pauseSocialChannel } from '../src/lib/news-social/repository';
import { processSocialChannel } from '../src/lib/news-social/processor';
import { budgetMonth, composeNewsPost, isEligibleNews } from '../src/lib/news-social/policy';
import { socialCredentialFingerprint, verifySocialIdentity } from '../src/lib/news-social/providers';
import { renderNewsStory } from '../src/lib/news-social/story';

async function main() {
assert.equal(env.DATABASE_URL, 'postgresql://fixture:fixture@127.0.0.1:15459/fixture');
assert.equal(env.DB_POOL_MAX, 1);
assert.equal(env.NEWS_SOCIAL_X_API_KEY, 'fixture-key');
const memory = new PGlite();
for (const statement of await generateMigration(generateDrizzleJson({}), upPgSnapshot(baseline))) await memory.exec(statement);
await memory.exec(`INSERT INTO posts (slug,title,excerpt,body_md) VALUES ('fixture-sentinel','History','Keep','Keep');`);
await memory.exec(await readFile('drizzle/0165_news_social_delivery.sql', 'utf8'));
assert.deepEqual(await generateMigration(upPgSnapshot(expected), generateDrizzleJson(schema)), []);
const server = new PGLiteSocketServer({ db: memory, host: '127.0.0.1', port: 15459 });
await server.start();

let mode: 'ok' | 'timeout' | 'rate' | 'auth' | 'wrong' | 'pending' = 'ok';
const writes: string[] = [];
const requests: string[] = [];
const originalFetch = globalThis.fetch;
globalThis.fetch = async (input, init) => {
  const url = String(input);
  assert.match(url, /^https:\/\/(api\.x\.com|graph\.facebook\.com)\//);
  requests.push(url);
  assert.ok(new Headers(init?.headers).get('Authorization'));
  assert.equal(new URL(url).searchParams.has('access_token'), false);
  if (url.endsWith('/users/me')) return Response.json({ data: { id: '123', username: mode === 'wrong' ? 'wrong' : 'SocialProES' } });
  if (url.includes('fields=id,username')) return Response.json({ id: '456', username: 'socialproes' });
  if (url.includes('fields=status_code')) return Response.json({ status_code: mode === 'pending' ? 'IN_PROGRESS' : 'FINISHED' });
  if (url.endsWith('/media')) {
    const body = new URLSearchParams(String(init?.body));
    assert.equal(body.get('media_type'), 'STORIES');
    assert.match(body.get('image_url') ?? '', /^https:\/\/socialpro\.es\/api\/news\/\d+\/story$/);
    writes.push('container'); return Response.json({ id: '777' });
  }
  writes.push(url.endsWith('/tweets') ? 'x' : 'instagram');
  if (mode === 'timeout') throw new Error('Simulated ACK loss');
  if (mode === 'rate') return Response.json({}, { status: 429 });
  if (mode === 'auth') return Response.json({}, { status: 401 });
  return Response.json(url.endsWith('/tweets') ? { data: { id: '888' } } : { id: '999' });
};

const now = new Date();
const start = new Date(now.getTime() - 60_000);
let sequence = 0;
const checks: string[] = [];
async function article(overrides: Partial<typeof schema.posts.$inferInsert> = {}) {
  const [post] = await db.insert(schema.posts).values({ slug: `fixture-news-${sequence++}`, title: 'TEST CS2: una noticia contrastada',
    excerpt: 'Información sintética para verificar la difusión de SocialPro.', bodyMd: 'TEST', status: 'published', vertical: 'news', publishedAt: now, ...overrides }).returning();
  assert.ok(post); return post;
}
async function reset() {
  // Only this verified disposable fixture is cleared between scenarios.
  await db.delete(schema.newsSocialDeliveries);
  await db.delete(schema.newsSocialChannels);
  await db.update(schema.posts).set({ status: 'draft' });
  mode = 'ok'; writes.length = 0; requests.length = 0;
  await activateSocialChannel('x', '123', socialCredentialFingerprint('x'), start);
  await activateSocialChannel('instagram', '456', socialCredentialFingerprint('instagram'), start);
}
try {
  const [sentinel] = await db.select().from(schema.posts).where(eq(schema.posts.slug, 'fixture-sentinel'));
  assert.equal(sentinel?.bodyMd, 'Keep'); checks.push('migration preserves existing content; snapshot matches');
  await reset();
  await article({ status: 'draft' });
  await article({ vertical: 'blog' });
  await article({ tags: ['press-outreach'] });
  await article({ slug: 'prensa-fixture-news' });
  await article({ tags: ['prensa', 'adaptacion-editorial'] });
  await article({ publishedAt: new Date(now.getTime() + 3_600_000) });
  await article({ publishedAt: new Date(start.getTime() - 1) });
  assert.equal(await processSocialChannel('x', now), 'idle'); assert.equal(requests.length, 0);
  const good = await article({ tags: ['prensa', 'anuncio-propio'] });
  assert.equal(await processSocialChannel('x', now), 'published');
  await db.update(schema.posts).set({ title: 'TEST edited title' }).where(eq(schema.posts.id, good.id));
  assert.equal(await processSocialChannel('x', now), 'idle');
  assert.deepEqual(writes, ['x']); checks.push('only new public news; excludes drafts/future/blog/press/history; edits/replay deduplicated');
  assert.equal(await processSocialChannel('instagram', now), 'published');
  assert.equal(await processSocialChannel('instagram', now), 'idle');
  assert.deepEqual(writes, ['x', 'container', 'instagram']); checks.push('Instagram create→status→publish; persisted receipt; replay no effect');

  await reset(); await article(); mode = 'timeout';
  assert.equal(await processSocialChannel('x', now), 'uncertain');
  assert.equal(await processSocialChannel('x', now), 'idle'); assert.deepEqual(writes, ['x']);
  checks.push('lost publishing ACK quarantined; no duplicate retry');

  await reset(); await article();
  await pauseSocialChannel('x');
  assert.equal(await processSocialChannel('x', now), 'paused'); assert.equal(requests.length, 0);
  await activateSocialChannel('x', '123', 'changed-fixture-fingerprint', now);
  assert.equal(await processSocialChannel('x', now), 'credentials_changed'); assert.equal(requests.length, 0);
  mode = 'wrong'; await assert.rejects(verifySocialIdentity('x'), /account_mismatch/);
  checks.push('pause, changed credentials and wrong account fail closed');

  await reset(); const withdrawn = await article(); await enqueueSocialNews('x', now);
  const claim = await claimSocialDelivery('x', now); assert.ok(claim);
  await db.update(schema.posts).set({ status: 'draft' }).where(eq(schema.posts.id, withdrawn.id));
  assert.equal(await beginSocialPublish(claim.delivery.id, 'x', socialCredentialFingerprint('x'), now), false);
  assert.equal(writes.length, 0); checks.push('withdrawal between claim and send cancels');

  await reset(); await article(); mode = 'rate';
  assert.equal(await processSocialChannel('x', now), 'failed');
  assert.equal(await processSocialChannel('x', now), 'idle'); assert.equal(writes.length, 1);
  const [retry] = await db.select().from(schema.newsSocialDeliveries); assert.equal(retry?.status, 'pending');
  assert.ok(retry && retry.nextAttemptAt > now); checks.push('429 backoff persisted without immediate resend');

  await reset(); await article(); mode = 'auth';
  assert.equal(await processSocialChannel('x', now), 'failed');
  assert.equal(await processSocialChannel('x', now), 'paused'); checks.push('expired authorization pauses channel');

  await reset(); await article();
  await db.update(schema.newsSocialChannels).set({ budgetMonth: budgetMonth(now), reservedCents: 400 }).where(eq(schema.newsSocialChannels.channel, 'x'));
  assert.equal(await processSocialChannel('x', now), 'held'); assert.equal(writes.length, 0);
  assert.equal(await processSocialChannel('instagram', now), 'published'); checks.push('monthly X cap; Instagram remains independent');

  await reset(); await article(); await enqueueSocialNews('x', now);
  const firstClaim = await claimSocialDelivery('x', now); assert.ok(firstClaim);
  assert.equal(await claimSocialDelivery('x', now), null);
  await beginSocialPublish(firstClaim.delivery.id, 'x', socialCredentialFingerprint('x'), now);
  await claimSocialDelivery('x', new Date(now.getTime() + 11 * 60_000));
  const [interrupted] = await db.select().from(schema.newsSocialDeliveries).where(eq(schema.newsSocialDeliveries.id, firstClaim.delivery.id));
  assert.equal(interrupted?.status, 'uncertain'); checks.push('restart during publish quarantines persisted lease');

  await reset(); const future = await article({ publishedAt: new Date(now.getTime() + 60_000) });
  assert.equal(await processSocialChannel('x', now), 'idle');
  assert.ok(isEligibleNews(future, start, new Date(now.getTime() + 60_001)));
  assert.ok(!isEligibleNews(future, start, new Date(now.getTime() + 49 * 3_600_000)));
  const text = composeNewsPost({ ...future, title: '@hacker https://evil.test ' + '界'.repeat(300) }).text;
  assert.ok(!text.includes('@hacker')); assert.ok(!text.includes('evil.test')); assert.ok(text.includes('utm_source=x'));
  checks.push('scheduled timing, stale-news exclusion, safe bounded copy and tracked link');

  globalThis.fetch = originalFetch;
  const image = await renderNewsStory({ title: 'StarSeries Barcelona 2026: fechas, equipos y formato del torneo de CS2', excerpt: 'Barcelona reúne a ocho equipos en la fase final. Consulta las fechas, el formato y las claves para seguir el torneo.' });
  assert.equal(image.subarray(0, 2).toString('hex'), 'ffd8');
  await mkdir('.scratch/news-social-20260915', { recursive: true });
  await writeFile('.scratch/news-social-20260915/story-preview.jpg', image);
  const receipt = { at: new Date().toISOString(), checks, database: 'disposable in-memory PostgreSQL', providers: 'mock HTTP; no public posts', imageBytes: image.length, concurrency: 'PGlite serialized; real PostgreSQL concurrency checked separately' };
  await writeFile('.scratch/news-social-20260915/fixture-receipt.json', JSON.stringify(receipt, null, 2));
  console.log(JSON.stringify(receipt, null, 2));
} finally {
  globalThis.fetch = originalFetch;
  await closeDbPool(); await server.stop(); await memory.close();
}
}
main().catch(error => { console.error(error); process.exitCode = 1; });
