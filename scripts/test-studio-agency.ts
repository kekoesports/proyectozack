/** Synthetic PostgreSQL integration fixture. No env files, network or paid providers. */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { generateDrizzleJson, generateMigration } from 'drizzle-kit/api';
import { eq, count } from 'drizzle-orm';
import * as schema from '../src/db/schema';
import { createStudioRepository } from '../src/lib/studio/repository';
import { createProductionRepository } from '../src/lib/studio/production-repository';
import { createChannelRepository } from '../src/lib/studio/channel-repository';
import { createNarrationRepository } from '../src/lib/studio/narration-repository';
import { StudioBoard } from '../src/lib/schemas/studio-production';
import { StudioProfileDocument } from '../src/lib/schemas/studio-profile';

async function main() {
  const pg = new PGlite(); const db = drizzle(pg, { schema }); let checks = 0;
  const check = (value: unknown, name: string) => { assert.ok(value, name); checks++; };
  try {
    for (const sql of await generateMigration(generateDrizzleJson({}), generateDrizzleJson(schema))) await pg.exec(sql);
    const now = new Date();
    await db.insert(schema.user).values(['admin', 'manager', 'staff', 'a', 'b'].map((id) => ({ id, name: id, role: id,
      email: `${id}@fixture.test`, emailVerified: true, createdAt: now, updatedAt: now })));
    const [ta, tb] = await db.insert(schema.talents).values(['a', 'b'].map((id) => ({ slug: `fixture-${id}`, name: id,
      role: 'creator', game: 'Gaming', platform: 'youtube' as const, bio: 'Synthetic only', gradientC1: '#f5632a', gradientC2: '#e03070', initials: id }))).returning();
    assert.ok(ta && tb);
    await db.insert(schema.talentUsers).values([{ talentId: ta.id, userId: 'a' }, { talentId: tb.id, userId: 'b' }]);
    const adminA = createStudioRepository(db, 'admin', ta.id), adminB = createStudioRepository(db, 'admin', tb.id);
    const a = createStudioRepository(db, 'a'), b = createStudioRepository(db, 'b');
    const pa = createProductionRepository(db, 'admin', ta.id), pb = createProductionRepository(db, 'admin', tb.id);
    const ca = createChannelRepository(db, 'admin', ta.id), cb = createChannelRepository(db, 'admin', tb.id);
    const na = createNarrationRepository(db, 'admin', ta.id), nb = createNarrationRepository(db, 'admin', tb.id);
    check(await createStudioRepository(db, 'admin').membership() === null, 'agency has no implicit creator membership');
    check((await adminA.membership())?.talentId === ta.id, 'admin can explicitly select existing talent');
    check((await createStudioRepository(db, 'manager', tb.id).membership())?.talentId === tb.id, 'manager can explicitly select talent');
    check(await createStudioRepository(db, 'admin', 2147483647).membership() === null, 'unknown talent cannot be selected');
    const input = { title: 'Agency fixture', template: 'educational' as const, platform: 'instagram' as const,
      brief: 'Isolated agency test only', script: 'Este guion es una prueba sintética. Nunca se envía a un proveedor.', cta: 'Fixture' };
    const project = await adminA.save(input), foreign = await adminB.save(input); assert.ok(project && foreign);
    check(project.createdBy === 'admin' && project.talentId === ta.id, 'agency author is recorded without impersonation');
    check((await a.project(project.id))?.id === project.id, 'creator sees agency draft in own workspace');
    check(await b.project(project.id) === null && await adminB.project(project.id) === null, 'creator and agency workspace B cannot read A');
    check(await adminA.save(input, { id: foreign.id, revision: 0 }) === null, 'agency selection cannot edit another talent');
    check(await adminA.save(input, { id: project.id, revision: 99 }) === null, 'optimistic revision protection retained');
    const file = { name: 'fixture.png', storageKey: 'synthetic/fixture.png', contentType: 'image/png', size: 20, checksum: 'synthetic', projectId: null };
    const asset = await adminA.addAsset(file), otherAsset = await adminB.addAsset({ ...file, storageKey: 'synthetic/other.png' }); assert.ok(asset && otherAsset);
    check((await adminA.asset(asset.id))?.rightsConfirmedBy === 'admin', 'rights audit keeps real agency actor');
    check(await adminB.asset(asset.id) === null, 'private assets are scoped to current agency selection');
    check(await adminA.addAsset({ ...file, projectId: foreign.id }) === null, 'cannot attach a file to another talent project');
    const board = StudioBoard.safeParse({ version: 1, format: '9:16', palette: 'light', audioAssetId: null,
      scenes: [{ id: randomUUID(), kind: 'image', assetId: asset.id, title: 'Fixture', body: '', duration: 2, start: 0 }] });
    assert.ok(board.success);
    check(await pa.saveBoard(project.id, -1, board.data), 'agency can save montage');
    check(await pb.board(project.id) === null && await pb.saveBoard(project.id, 0, board.data) === null, 'agency montage scope cannot be crossed');
    check(await pa.saveBoard(project.id, 0, { ...board.data, scenes: board.data.scenes.map((scene) => ({ ...scene, assetId: otherAsset.id })) }) === null, 'foreign media rejected inside timeline');
    const render = await pa.enqueue(project.id, 0, 0); assert.ok(render);
    const [renderRow] = await db.select().from(schema.studioRenders).where(eq(schema.studioRenders.id, render.id));
    check(renderRow?.requestedBy === 'admin', 'render request records agency actor');
    check((await pa.enqueue(project.id, 0, 0))?.id === render.id, 'render request stays idempotent');
    check(await pb.enqueue(project.id, 0, 0) === null && (await pb.renders(project.id)).length === 0, 'render visibility and queue are scoped');
    check(await pa.plan(project.id, now) && !await pb.plan(project.id, now), 'calendar writes stay scoped');
    check((await pa.schedule()).length === 1 && (await pb.schedule()).length === 0, 'calendar reads stay scoped');
    const turn = { id: randomUUID(), projectId: project.id, revision: 0, prompt: 'Fixture', engine: 'synthetic' };
    check(await pa.beginTurn(turn) && !await pb.beginTurn({ ...turn, id: randomUUID() }), 'chat persistence uses selected workspace');
    check((await pb.turns(project.id)).length === 0, 'chat history remains private');
    check(await ca.declare({ platform: 'youtube', handle: 'fixture-a' }), 'agency can declare channel');
    check((await cb.list()).length === 0, 'channels remain selected-talent only');
    const profile = StudioProfileDocument.safeParse({ version: 1, displayName: 'Fixture A', role: 'Test', bio: 'Synthetic profile', pronunciation: 'Test',
      voiceStatus: 'approved_external', usageScope: 'Synthetic only', portraitAssetId: null, voiceAssetId: null, approvedVideoAssetId: null, logoAssetId: null,
      guidelines: [], team: [], currentCreators: [], collaborators: [], sources: [{ label: 'Synthetic', kind: 'owner', date: '2026-09-06' }], cases: [],
      publicationNotes: 'Never publish', higgsfieldVoice: { id: randomUUID(), name: 'Synthetic', verifiedAt: now.toISOString() } }); assert.ok(profile.success);
    await db.insert(schema.studioProfiles).values({ talentId: ta.id, document: profile.data, recordedBy: 'admin' });
    check((await adminA.profile())?.displayName === 'Fixture A' && await adminB.profile() === null, 'voice/identity profile follows selected talent');
    const narration = await na.request(project.id, 0); assert.ok(narration);
    const [narrationRow] = await db.select().from(schema.studioNarrations).where(eq(schema.studioNarrations.id, narration.id));
    check(narrationRow?.requestedBy === 'admin' && narrationRow.status === 'quote_requested', 'voice request does not approve spending');
    check(await nb.request(project.id, 0) === null && (await nb.list(project.id)).length === 0, 'cannot use voice in another selected workspace');
    for (const id of ['staff', 'a', 'b']) {
      const forged = createStudioRepository(db, id, ta.id);
      check(await forged.membership() === null && (await forged.projects()).length === 0, `${id}: forged selection does not grant reads`);
      check(await forged.save(input) === null && await forged.addAsset(file) === null, `${id}: forged selection does not grant writes`);
      check(!await createChannelRepository(db, id, ta.id).declare({ platform: 'youtube', handle: 'forged' }), `${id}: channel lock rejects forged scope`);
    }
    await db.update(schema.user).set({ role: 'staff' }).where(eq(schema.user.id, 'admin'));
    check(await adminA.membership() === null && await adminA.profile() === null && (await adminA.assets()).length === 0, 'live demotion removes reads from existing repository');
    check(await adminA.save(input) === null && await adminA.addAsset(file) === null, 'live demotion removes locked writes');
    check(await pa.board(project.id) === null && await pa.saveBoard(project.id, 0, board.data) === null && await pa.enqueue(project.id, 0, 0) === null, 'demotion removes montage/render access');
    check(!await pa.plan(project.id, now) && (await pa.turns(project.id)).length === 0 && (await ca.list()).length === 0 && await na.request(project.id, 0) === null, 'demotion removes calendar, chat, channel and narration access');
    const [members] = await db.select({ total: count() }).from(schema.talentUsers);
    check(members?.total === 2, 'agency mode never creates or changes creator memberships');
    console.log(JSON.stringify({ ok: true, checks, network: false, providerCalls: 0, productionTouched: false }));
  } finally { await pg.close(); }
}
main().catch((error: unknown) => { console.error(error instanceof Error ? error.message : 'Agency fixture failed'); process.exitCode = 1; });
