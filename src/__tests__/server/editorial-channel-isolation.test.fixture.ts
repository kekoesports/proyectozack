import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { eq } from 'drizzle-orm';
import * as schema from '@/db/schema';
import { isPressOutreach } from '@/lib/content-channel';
import { webEditorialCondition } from '@/lib/queries/content-channel';

const mockClient = new PGlite();
const mockDb = drizzle(mockClient, { schema });
const mockPermission = jest.fn().mockResolvedValue({ user: { id: 'fixture' } });
const mockEmail = jest.fn();
jest.mock('@/lib/db', () => ({ get db() { return mockDb; } }));
jest.mock('@/lib/permissions', () => ({ requirePermission: (...args: unknown[]) => mockPermission(...args) }));
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }));
jest.mock('next/navigation', () => ({ redirect: (url: string) => { throw new Error(`redirect:${url}`); } }));
jest.mock('next/headers', () => ({ headers: jest.fn() }));
jest.mock('@/lib/auth', () => ({ auth: {} }));
jest.mock('@/lib/auth-guard', () => ({ IS_DEV: true }));
jest.mock('@/lib/email', () => ({ sendNewsletterPostEmail: (...args: unknown[]) => mockEmail(...args) }));

import { getPressDrafts } from '@/lib/queries/pressTargets';
import { getAllEditorialPostsForAdmin, getAllNewsPostsForAdmin, getPublishedNewsPostsForAdmin, getEditorialSlots, getEditorialCadence } from '@/lib/queries/editorialSlots';
import { getNewsPosts, getNewsSlugs, getPostBySlug, getNewsUniqueTags } from '@/lib/queries/posts';
import { createPostAction, updatePostAction, updateEditorialSlotAction } from '@/app/admin/(dashboard)/noticias/actions';
import { updatePressDraftAction } from '@/app/admin/(dashboard)/prensa-targets/articulos/actions';
import { POST } from '@/app/api/newsletter/send/route';
import { NextRequest } from 'next/server';

const now = new Date();
const records = [
  { id: 1, slug: 'fixture-cs2-news', tags: ['cs2'], status: 'published', publishedAt: now },
  { id: 2, slug: 'prensa-fixture-draft', tags: ['prensa', 'adaptacion-editorial'], status: 'draft', publishedAt: null },
  { id: 3, slug: 'fixture-internal-published', tags: ['press-outreach'], status: 'published', publishedAt: now },
  { id: 4, slug: 'fixture-own-announcement', tags: ['prensa', 'socialpro'], status: 'published', publishedAt: now },
  { id: 5, slug: 'fixture-legacy-press', tags: ['prensa', 'adaptacion-editorial'], status: 'published', publishedAt: now },
  { id: 6, slug: 'fixture-scheduled-news', tags: ['cs2'], status: 'published', publishedAt: new Date(Date.now() + 86400000) },
] as const;

beforeAll(async () => {
  // In-memory PostgreSQL fixture only. No application env, network, production DB or mail provider.
  await mockClient.exec(`
    CREATE TABLE posts (
      id serial primary key, slug text unique not null, title text not null, excerpt text not null,
      body_md text not null, author text not null default 'TEST', status text not null default 'draft',
      vertical text not null default 'news', content_type text not null default 'noticias',
      cover_url text, og_image_url text, published_at timestamptz, sort_order integer not null default 0,
      tags jsonb not null default '[]', talent_slugs jsonb, blocks_json jsonb,
      updated_at timestamptz not null default now()
    );
    CREATE TABLE editorial_slots (id serial primary key, slot text, post_id integer, meta jsonb, updated_at timestamptz default now());
  `);
  for (const row of records) {
    await mockDb.insert(schema.posts).values({ ...row, tags: [...row.tags], title: `TEST ${row.id}`, excerpt: 'Synthetic editorial test only', bodyMd: 'TEST original body', coverUrl: 'https://example.com/test.webp' });
  }
  await mockDb.insert(schema.editorialSlots).values({ slot: 'hero', postId: 3 });
}, 30000);

afterAll(async () => { await mockClient.close(); });

describe('web / press / subscriber isolation through real fixture queries', () => {
  it('JS and SQL classify reserved channels identically; own announcements remain web content', async () => {
    const web = await mockDb.select().from(schema.posts).where(webEditorialCondition);
    expect(web.map((row) => row.id).sort()).toEqual(records.filter((row) => !isPressOutreach(row)).map((row) => row.id));
    expect(web.map((row) => row.id)).toContain(4);
  });

  it('admin lists and press editor inventory are disjoint without losing existing documents', async () => {
    expect((await getAllEditorialPostsForAdmin()).map((row) => row.id).sort()).toEqual([1, 4, 6]);
    expect((await getAllNewsPostsForAdmin()).map((row) => row.id).sort()).toEqual([1, 4, 6]);
    expect((await getPressDrafts()).map((row) => row.id).sort()).toEqual([2, 3, 5]);
    expect((await mockDb.select().from(schema.posts))).toHaveLength(6);
  });

  it('public news, sitemap, detail, tag lists and subscriber selection exclude press even with published status', async () => {
    expect((await getNewsPosts()).map((row) => row.id).sort()).toEqual([1, 4]);
    expect((await getPublishedNewsPostsForAdmin()).map((row) => row.id).sort()).toEqual([1, 4]);
    expect((await getNewsSlugs()).some((row) => row.slug.includes('internal') || row.slug.includes('legacy'))).toBe(false);
    expect(await getPostBySlug('fixture-internal-published')).toBeUndefined();
    expect(await getNewsUniqueTags()).not.toContain('press-outreach');
    expect(await getNewsUniqueTags()).toContain('socialpro');
  });

  it('press assignments neither render in a web slot nor fill its weekly quota', async () => {
    expect((await getEditorialSlots())[0]?.post).toBeNull();
    const cadence = await getEditorialCadence();
    const pressIds = new Set([2, 3, 5]);
    expect(cadence.some((week) => week.news && pressIds.has(week.news.id))).toBe(false);
    await mockDb.update(schema.editorialSlots).set({ postId: 1 });
    const form = new FormData(); form.set('slot', 'hero'); form.set('postId', '3');
    await updateEditorialSlotAction(form);
    expect((await mockDb.select().from(schema.editorialSlots))[0]?.postId).toBe(1);
  });

  it('a stale news form cannot strip press markers and publish the draft', async () => {
    const form = new FormData();
    Object.entries({ id: '2', slug: 'converted-fixture', tags: 'cs2', status: 'published', coverUrl: 'https://example.com/test.webp' }).forEach(([key, value]) => form.set(key, value));
    expect((await updatePostAction(form)).ok).toBe(false);
    const [saved] = await mockDb.select().from(schema.posts).where(eq(schema.posts.id, 2));
    expect(saved?.status).toBe('draft');
    expect(saved?.slug).toBe('prensa-fixture-draft');
  });

  it('news creation rejects outreach markers', async () => {
    const form = new FormData();
    Object.entries({ title: 'TEST new draft', slug: 'prensa-fixture-new', excerpt: 'TEST synthetic excerpt', bodyMd: 'TEST body' }).forEach(([key, value]) => form.set(key, value));
    expect((await createPostAction(form)).ok).toBe(false);
    expect((await mockDb.select().from(schema.posts))).toHaveLength(6);
  });

  it('dedicated press editing persists text but ignores forged publish/channel fields; repeat saves remain one document', async () => {
    const form = new FormData();
    Object.entries({ id: '2', title: 'TEST revised proposal', excerpt: 'TEST revised synthetic summary', bodyMd: 'TEST revised body', author: 'TEST', status: 'published', tags: 'cs2', slug: 'converted-fixture' }).forEach(([key, value]) => form.set(key, value));
    for (let repeat = 0; repeat < 2; repeat++) {
      await expect(updatePressDraftAction(form)).rejects.toThrow('redirect:/admin/prensa-targets');
    }
    const [saved] = await mockDb.select().from(schema.posts).where(eq(schema.posts.id, 2));
    expect(saved?.bodyMd).toBe('TEST revised body');
    expect(saved?.status).toBe('draft');
    expect(saved?.slug).toBe('prensa-fixture-draft');
    expect((await mockDb.select().from(schema.posts))).toHaveLength(6);
    form.set('id', '1');
    expect((await updatePressDraftAction(form)).ok).toBe(false);
    expect(mockPermission).toHaveBeenCalledWith('prensa_targets', 'write');
  });

  it.each([2, 3, 5, 6])('newsletter rejects press or scheduled post %s before delivery or send reservation', async (postId) => {
    const request = new NextRequest('http://localhost/api/newsletter/send', { method: 'POST', body: JSON.stringify({ postId }) });
    const response = await POST(request);
    expect(response.status).toBe(422);
    expect(mockEmail).not.toHaveBeenCalled();
    // No newsletter tables exist in this fixture: reaching a reservation would fail the test.
  });

  it('permission denial prevents edits before reaching storage', async () => {
    mockPermission.mockRejectedValueOnce(new Error('fixture permission denied'));
    await expect(updatePressDraftAction(new FormData())).rejects.toThrow('fixture permission denied');
  });
});
