/**
 * Explicitly fresh disposable PG17 fixture only; schema must already come from reviewed migrations.
 * CREATOR_QA_ONLY=true node -r ./scripts/worker-preload.cjs --import tsx scripts/qa/creator-retention-db-check.ts
 * Requires DATABASE_URL naming socialpro_creator_qa_retention*. No dotenv, provider calls, DDL or deletes.
 * All seed rows and permission statements are SYNTHETIC; they do not grant production authority.
 */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { Client } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { z } from 'zod';

const checks: string[] = [];
let stage = 'environment_gate', blockedHttpAttempts = 0;

async function main(): Promise<void> {
  const environment = z.object({ CREATOR_QA_ONLY: z.literal('true'), DATABASE_URL: z.url() })
    .safeParse({ CREATOR_QA_ONLY: process.env.CREATOR_QA_ONLY, DATABASE_URL: process.env.DATABASE_URL });
  assert.ok(environment.success, 'creator_retention_qa_environment_required');
  const url = new URL(environment.data.DATABASE_URL);
  const databaseName = decodeURIComponent(url.pathname.slice(1));
  assert.ok(['postgres:', 'postgresql:'].includes(url.protocol), 'creator_retention_qa_postgres_only');
  assert.match(databaseName, /^socialpro_creator_qa_retention[a-zA-Z0-9_]*$/);
  assert.equal(url.searchParams.has('options'), false, 'creator_retention_qa_no_url_options');
  assert.ok(!process.env.PGOPTIONS, 'creator_retention_qa_no_pgoptions');
  const marker = `synthetic_retention_${randomUUID().replaceAll('-', '')}`;
  url.searchParams.set('application_name', marker);
  process.env.DATABASE_URL = url.toString();
  globalThis.fetch = () => { blockedHttpAttempts++; return Promise.reject(new Error('creator_retention_qa_http_forbidden')); };
  const verifier = new Client({ connectionString: url.toString(), connectionTimeoutMillis: 5000, statement_timeout: 20_000 });
  let closePool: (() => Promise<void>) | undefined;
  let held = false;
  let pending: Promise<unknown> | undefined;
  try {
    await verifier.connect();
    const actual: unknown = (await verifier.query('select current_database() as name, current_schema() as schema')).rows;
    const parsed = z.array(z.object({ name: z.string(), schema: z.literal('public') })).length(1).safeParse(actual);
    assert.ok(parsed.success, 'creator_retention_qa_identity_invalid');
    assert.equal(parsed.data[0]?.name, databaseName, 'creator_retention_qa_destination_mismatch');
    const lock: unknown = (await verifier.query('select pg_try_advisory_lock(16945005, 151) as acquired')).rows;
    assert.ok(z.array(z.object({ acquired: z.literal(true) })).length(1).safeParse(lock).success, 'creator_retention_qa_already_running');
    const { db, closeDbPool } = await import('../../src/lib/db');
    closePool = closeDbPool;
    const { eq, and } = await import('drizzle-orm');
    const s = await import('../../src/db/schema');
    const { expireCreatorMetricPayloads } = await import('../../src/lib/queries/creatorRetention');
    const { getAllTargets, getBrandTargets } = await import('../../src/lib/queries/targets');
    const { getActiveTargetsPage } = await import('../../src/lib/queries/creatorTargetsApi');
    const { persistDiscoveredCreator } = await import('../../src/lib/queries/creatorIdentity');
    const { creatorObservation } = await import('../../src/lib/targets/creator-observations');
    const { normalizeCreatorAccountKey } = await import('../../src/lib/targets/search-profile');
    const now = new Date(), old = new Date(now.getTime() - 2 * 86_400_000), yesterday = new Date(now.getTime() - 86_400_000);
    const tomorrow = new Date(now.getTime() + 86_400_000);
    const externalId = 'UC' + randomUUID().replaceAll('-', '').slice(0, 22);
    stage = 'fresh_fixture_gate';
    for (const table of [s.user, s.targets, s.creatorAccounts, s.creatorIdentities, s.creatorProviderPermissions,
      s.creatorFeedback, s.creatorDiscoveryRuns, s.creatorAccountObservations]) {
      assert.equal((await db.select().from(table).limit(1)).length, 0, 'creator_retention_qa_requires_empty_fixture');
    }
    checks.push(stage);
    const rows = await db.transaction(async tx => {
      await tx.insert(s.user).values({ id: marker, name: 'SYNTHETIC Retention QA — no login',
        email: `${marker}@example.invalid`, role: 'staff', emailVerified: false, createdAt: now, updatedAt: now });
      await tx.insert(s.creatorProviderPermissions).values({ platform: 'youtube', retentionDays: 1,
        commercialApproved: true, derivedMetricsApproved: true, evidenceRef: 'SYNTHETIC disposable retention QA',
        reviewedBy: marker, reviewedAt: yesterday });
      const [target] = await tx.insert(s.targets).values({ platform: 'youtube', username: externalId,
        profileUrl: 'https://example.invalid/synthetic-retention', followers: 1234, fitScore: 75,
        qualificationStatus: 'qualified', fitReasons: ['SYNTHETIC expired metric'], status: 'contactado',
        notes: 'SYNTHETIC manual notes preserved', contactEmail: 'manual@example.invalid', brandUserId: marker,
        contactedAt: yesterday, discoveredVia: 'synthetic:retention-qa' }).returning();
      const [identity] = await tx.insert(s.creatorIdentities).values({ displayName: 'SYNTHETIC retained identity',
        sourceFirstSeen: 'synthetic:retention-qa', sourceLastSeen: 'synthetic:retention-qa' }).returning();
      const [run] = await tx.insert(s.creatorDiscoveryRuns).values({ trigger: 'synthetic_qa', status: 'fixture' }).returning();
      assert.ok(target && identity && run, 'creator_retention_qa_seed_failed');
      const fields = { followers: creatorObservation(1234, 'youtube:channels.list:subscriberCount', old),
        fitScore: creatorObservation(75, 'crm:scoreCreatorFit', old) };
      const [account] = await tx.insert(s.creatorAccounts).values({ creatorId: identity.id, targetId: target.id,
        platform: 'youtube', externalId, username: externalId, profileUrl: target.profileUrl, fields, expiresAt: yesterday,
        identityEvidence: { confidence: 'HIGH', source: 'synthetic:retention-qa', reason: 'Synthetic immutable ID' } }).returning();
      assert.ok(account, 'creator_retention_qa_account_failed');
      const [snapshot] = await tx.insert(s.creatorAccountObservations).values({ accountId: account.id, runId: run.id,
        fields, observedAt: old, expiresAt: yesterday }).returning();
      assert.ok(snapshot, 'creator_retention_qa_snapshot_failed');
      return { target, identity, run, account, snapshot };
    });
    const readTarget = async () => {
      const [target] = await db.select().from(s.targets).where(eq(s.targets.id, rows.target.id));
      assert.ok(target, 'creator_retention_qa_target_lost'); return target;
    };
    const readAccount = async () => {
      const [account] = await db.select().from(s.creatorAccounts).where(eq(s.creatorAccounts.id, rows.account.id));
      assert.ok(account, 'creator_retention_qa_account_lost'); return account;
    };
    stage = 'all_brand_api_expiry_projection';
    for (const views of [await getAllTargets(), await getBrandTargets(marker), (await getActiveTargetsPage({ limit: 10 })).items]) {
      assert.equal(views.length, 1); assert.equal(views[0]?.followers, null); assert.equal(views[0]?.fitScore, null);
      assert.equal(views[0]?.notes, rows.target.notes); assert.equal(views[0]?.status, 'contactado');
    }
    checks.push(stage);
    stage = 'physical_payload_cleanup_without_history_deletion';
    assert.deepEqual(await expireCreatorMetricPayloads(), { status: 'success', processedAccounts: 1, clearedSnapshots: 1, errors: 0 });
    assert.deepEqual((await readAccount()).fields, {});
    const [snapshot] = await db.select().from(s.creatorAccountObservations).where(eq(s.creatorAccountObservations.id, rows.snapshot.id));
    assert.ok(snapshot); assert.deepEqual(snapshot.fields, {}); assert.equal(snapshot.runId, rows.run.id);
    const cleaned = await readTarget();
    assert.equal(cleaned.followers, null); assert.equal(cleaned.qualificationStatus, 'unavailable');
    assert.equal(cleaned.notes, rows.target.notes); assert.equal(cleaned.contactEmail, rows.target.contactEmail);
    assert.equal(cleaned.status, rows.target.status); assert.equal(cleaned.brandUserId, marker);
    assert.equal((await db.select().from(s.creatorIdentities)).length, 1);
    checks.push(stage);
    stage = 'cleared_snapshot_still_prevents_run_replay';
    assert.deepEqual(await persistDiscoveredCreator({ runId: rows.run.id, externalId,
      target: { platform: 'youtube', username: externalId, profileUrl: rows.target.profileUrl, followers: 9999 },
      fields: { followers: creatorObservation(9999, 'youtube:channels.list:subscriberCount', new Date()) } }),
    { inserted: 0, updated: 0, represented: false, identityReview: false });
    assert.equal((await readAccount()).timesObserved, rows.account.timesObserved);
    assert.equal((await readTarget()).followers, null);
    checks.push(stage);
    stage = 'legacy_or_shortened_policy_cleanup';
    await db.update(s.creatorAccounts).set({ fields: { followers: creatorObservation(1234, 'youtube:channels.list:subscriberCount', old) },
      expiresAt: new Date(now.getTime() + 30 * 86_400_000) }).where(eq(s.creatorAccounts.id, rows.account.id));
    assert.equal((await expireCreatorMetricPayloads()).processedAccounts, 1);
    assert.deepEqual((await readAccount()).fields, {});
    checks.push(stage);
    stage = 'real_lock_refresh_race';
    await db.update(s.creatorAccounts).set({ fields: { followers: creatorObservation(1234, 'youtube:channels.list:subscriberCount', old) },
      expiresAt: yesterday }).where(eq(s.creatorAccounts.id, rows.account.id));
    await verifier.query('begin'); held = true;
    await verifier.query('select pg_advisory_xact_lock(hashtext($1))', [normalizeCreatorAccountKey('youtube', externalId)]);
    const waiting = expireCreatorMetricPayloads(); pending = waiting;
    const stop = Date.now() + 3000;
    let blocked = false;
    while (!blocked && Date.now() < stop) {
      // Activity statistics can be cached within this held transaction; refresh this session's snapshot.
      await verifier.query('select pg_stat_clear_snapshot()');
      const observedWait: unknown = (await verifier.query("select exists(select 1 from pg_stat_activity where datname = $1 and application_name = $2 and wait_event = 'advisory') as waiting", [databaseName, marker])).rows;
      const waitResult = z.array(z.object({ waiting: z.boolean() })).length(1).safeParse(observedWait);
      assert.ok(waitResult.success, 'creator_retention_qa_wait_state_invalid');
      blocked = waitResult.data[0]?.waiting === true;
      if (!blocked) await new Promise(resolve => setTimeout(resolve, 30));
    }
    assert.equal(blocked, true, 'creator_retention_qa_lock_not_observed');
    const refreshedAt = new Date();
    const fresh = { followers: { ...creatorObservation(2468, 'youtube:channels.list:subscriberCount', refreshedAt),
      expires_at: tomorrow.toISOString(), retention_days: 1 } };
    const heldDb = drizzle(verifier);
    await heldDb.update(s.creatorAccounts).set({ fields: fresh, expiresAt: tomorrow }).where(eq(s.creatorAccounts.id, rows.account.id));
    await heldDb.update(s.targets).set({ followers: 2468 }).where(eq(s.targets.id, rows.target.id));
    await verifier.query('commit'); held = false;
    assert.equal((await waiting).status, 'success'); pending = undefined;
    assert.equal((await readTarget()).followers, 2468); assert.equal((await readAccount()).fields.followers?.value, 2468);
    checks.push(stage);
    stage = 'failed_refresh_keeps_original_expiry';
    const beforePartial = await readAccount();
    await persistDiscoveredCreator({ externalId, target: { platform: 'youtube', username: externalId, profileUrl: rows.target.profileUrl },
      fields: { followers: creatorObservation(null, 'youtube:channels.list:subscriberCount', new Date(), 'error') } });
    const afterPartial = await readAccount();
    assert.equal(afterPartial.fields.followers?.value, 2468);
    assert.equal(afterPartial.fields.followers?.expires_at, beforePartial.fields.followers?.expires_at);
    assert.equal(afterPartial.fields.followers?.observed_at, beforePartial.fields.followers?.observed_at);
    assert.equal((await readTarget()).status, 'contactado'); assert.equal((await readTarget()).notes, rows.target.notes);
    assert.equal((await db.select().from(s.creatorAccountObservations).where(and(
      eq(s.creatorAccountObservations.accountId, rows.account.id), eq(s.creatorAccountObservations.runId, rows.run.id)))).length, 1);
    assert.equal(blockedHttpAttempts, 0); checks.push(stage);
  } finally {
    if (held) await verifier.query('rollback');
    if (pending) await pending.catch(() => undefined); // No background cleanup is abandoned after a failed assertion.
    if (closePool) await closePool();
    await verifier.end();
  }
}
main().then(() => {
  console.log(JSON.stringify({ ok: true, checks, blockedHttpAttempts, fixturesPreserved: true }));
}).catch(() => {
  console.error(JSON.stringify({ ok: false, stage, checks, blockedHttpAttempts, fixturesPreserved: true }));
  process.exitCode = 1;
});
