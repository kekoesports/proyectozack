/**
 * Disposable PostgreSQL 17 only; apply the reviewed Drizzle migrations beforehand.
 * Run from the repository with root-supplied synthetic app env, NOT dotenv:
 * CREATOR_QA_ONLY=true node -r ./scripts/worker-preload.cjs --import tsx scripts/qa/creator-discovery-db-check.ts
 * DATABASE_URL must name a fresh socialpro_creator_qa* database. No DDL or cleanup.
 * Fixtures and permission records below are SYNTHETIC, not real provider approvals.
 * This checks persistence, not application authentication or a real provider/Discord.
 */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { Client } from 'pg';
import { z } from 'zod';

const checks: string[] = [];
let stage = 'environment_gate';
let blockedHttpAttempts = 0;
const channelId = '100000000000000001', guildId = '100000000000000002';
const messageId = '100000000000000003';
const fixturePrefix = `synthetic_creator_qa_${randomUUID().replaceAll('-', '')}`;

async function main(): Promise<void> {
  const environment = z.object({ CREATOR_QA_ONLY: z.literal('true'), DATABASE_URL: z.url() })
    .safeParse({ CREATOR_QA_ONLY: process.env.CREATOR_QA_ONLY, DATABASE_URL: process.env.DATABASE_URL });
  assert.ok(environment.success, 'creator_qa_environment_required');
  const url = new URL(environment.data.DATABASE_URL);
  const expectedDatabase = decodeURIComponent(url.pathname.slice(1));
  assert.ok(['postgres:', 'postgresql:'].includes(url.protocol), 'creator_qa_postgres_only');
  assert.match(expectedDatabase, /^socialpro_creator_qa[a-zA-Z0-9_]*$/);
  // Avoid startup options/search paths redirecting the same SQL to another schema.
  assert.equal(url.searchParams.has('options'), false, 'creator_qa_no_url_options');
  assert.ok(!process.env.PGOPTIONS, 'creator_qa_no_pgoptions');
  // Discard inherited destinations. These numeric sentinels are never transmitted.
  process.env.DISCORD_CREATOR_DISCOVERY_CHANNEL_ID = channelId;
  process.env.DISCORD_CREATOR_DISCOVERY_GUILD_ID = guildId;
  globalThis.fetch = () => {
    blockedHttpAttempts += 1;
    return Promise.reject(new Error('creator_qa_http_forbidden'));
  };
  const verifier = new Client({ connectionString: environment.data.DATABASE_URL,
    connectionTimeoutMillis: 5000, statement_timeout: 20_000 });
  let closeApplicationPool: (() => Promise<void>) | undefined;
  try {
    await verifier.connect();
    stage = 'actual_database_gate';
    const identity: unknown = (await verifier.query('select current_database() as name, current_schema() as schema')).rows;
    const parsed = z.array(z.object({ name: z.string(), schema: z.literal('public') })).length(1).safeParse(identity);
    assert.ok(parsed.success, 'creator_qa_actual_database_invalid');
    assert.equal(parsed.data[0]?.name, expectedDatabase, 'creator_qa_database_mismatch');
    // Dedicated session serializes this canary; it never locks production operations.
    const lock: unknown = (await verifier.query('select pg_try_advisory_lock(16945005, 150) as acquired')).rows;
    assert.ok(z.array(z.object({ acquired: z.literal(true) })).length(1).safeParse(lock).success, 'creator_qa_already_running');
    const { db, closeDbPool } = await import('../../src/lib/db');
    closeApplicationPool = closeDbPool;
    const { eq, and } = await import('drizzle-orm');
    const s = await import('../../src/db/schema');
    const profileQueries = await import('../../src/lib/queries/creatorSearchProfiles');
    const { runCreatorSearchProfile } = await import('../../src/lib/services/creatorSearchProfiles');
    const { persistDiscoveredCreator } = await import('../../src/lib/queries/creatorIdentity');
    const { createCreatorBudgetGuard } = await import('../../src/lib/queries/creatorDiscoveryBudget');
    const { creatorApiBudget } = await import('../../src/lib/targets/creator-api-budget');
    const digest = await import('../../src/lib/queries/creatorDigest');
    const { DEFAULT_CREATOR_SEARCH_PROFILE, creatorObservationSchema } = await import('../../src/lib/schemas/creator-search-profile');
    const { createTargetSchema } = await import('../../src/lib/schemas/target');
    stage = 'fresh_fixture_gate';
    // Refuse a rerun or a populated clone; no truncation, deletion or overwriting seeds.
    for (const table of [s.user, s.targets, s.talents, s.talentSocials, s.creatorSearchProfiles,
      s.creatorAccounts, s.creatorIdentities, s.creatorProviderPermissions, s.creatorFeedback,
      s.creatorDiscoveryRuns, s.creatorAccountObservations, s.creatorDailyApiUsage,
      s.creatorDigestOutbox, s.automationRegistry]) {
      assert.equal((await db.select().from(table).limit(1)).length, 0, 'creator_qa_requires_fresh_fixture');
    }
    checks.push('destination_and_empty_creator_fixture');
    const now = new Date();
    const actorId = fixturePrefix;
    const seed = await db.transaction(async (tx) => {
      await tx.insert(s.user).values({ id: actorId, name: 'SYNTHETIC Creator QA — no login',
        email: `${actorId}@example.invalid`, emailVerified: false, role: 'staff', createdAt: now, updatedAt: now });
      const [target] = await tx.insert(s.targets).values({ username: `${fixturePrefix}_original`, platform: 'twitch',
        profileUrl: `https://example.invalid/${fixturePrefix}`, followers: 1200, status: 'contactado',
        notes: 'SYNTHETIC QA — preserve manual notes', discoveredVia: 'synthetic:creator-qa:seed' }).returning();
      const runs = await tx.insert(s.creatorDiscoveryRuns).values([
        { trigger: 'synthetic_qa', status: 'fixture' }, { trigger: 'synthetic_qa', status: 'fixture' },
      ]).returning();
      assert.ok(target && runs[0] && runs[1], 'creator_qa_fixture_insert_failed');
      return { target, firstRun: runs[0], secondRun: runs[1] };
    });

    stage = 'profile_same_version_cas';
    const config = { ...DEFAULT_CREATOR_SEARCH_PROFILE, name: `${fixturePrefix}_profile`, platforms: ['instagram'] };
    const profile = await profileQueries.saveCreatorSearchProfile(config, actorId);
    assert.ok(profile, 'creator_qa_profile_missing');
    const updates = await Promise.allSettled([
      profileQueries.saveCreatorSearchProfile({ ...config, targetMedianViews: 1100 }, actorId, profile),
      profileQueries.saveCreatorSearchProfile({ ...config, targetMedianViews: 1200 }, actorId, profile),
    ]);
    assert.equal(updates.filter((item) => item.status === 'fulfilled').length, 1);
    const rejected = updates.find((item) => item.status === 'rejected');
    assert.ok(rejected?.status === 'rejected' && rejected.reason instanceof Error);
    assert.equal(rejected.reason.message, 'creator_profile_changed_reload');
    const readProfile = async () => {
      const [row] = await db.select().from(s.creatorSearchProfiles).where(eq(s.creatorSearchProfiles.id, profile.id));
      assert.ok(row, 'creator_qa_profile_lost');
      return row;
    };
    const edited = await readProfile();
    assert.equal(edited.version, profile.version + 1);
    checks.push(stage);

    stage = 'due_claim_and_lease_without_providers';
    // Real service, no mock success: absent provider permissions forbid discovery.
    assert.equal((await runCreatorSearchProfile(profile.id, 'scheduled')).ok, false);
    const future = new Date(Date.now() + 3_600_000), past = new Date(Date.now() - 60_000);
    await db.update(s.creatorSearchProfiles).set({ enabled: true, config: { ...edited.config, enabled: true },
      nextRunAt: future }).where(eq(s.creatorSearchProfiles.id, profile.id));
    assert.equal((await runCreatorSearchProfile(profile.id, 'scheduled')).ok, false);
    assert.equal((await readProfile()).nextRunAt?.getTime(), future.getTime());
    const heldToken = randomUUID();
    await db.update(s.creatorSearchProfiles).set({ nextRunAt: past, leaseToken: heldToken, leaseUntil: future })
      .where(eq(s.creatorSearchProfiles.id, profile.id));
    assert.equal((await runCreatorSearchProfile(profile.id, 'scheduled')).ok, false);
    assert.equal((await readProfile()).leaseToken, heldToken);
    await db.update(s.creatorSearchProfiles).set({ leaseUntil: past }).where(eq(s.creatorSearchProfiles.id, profile.id));
    assert.equal((await runCreatorSearchProfile(profile.id, 'scheduled')).ok, false);
    const released = await readProfile();
    assert.equal(released.leaseToken, null);
    assert.equal(released.leaseUntil, null);
    assert.equal(released.lastRunAt, null);
    assert.ok(released.nextRunAt && released.nextRunAt > past);
    assert.equal((await db.select().from(s.creatorDiscoveryRuns)).length, 2);
    assert.equal(blockedHttpAttempts, 0);
    // Restore the synthetic profile to paused; never leave scheduled test work enabled.
    await profileQueries.saveCreatorSearchProfile({ ...released.config, enabled: false }, actorId, released);
    checks.push(stage);

    stage = 'identity_permission_and_same_run_replay';
    const observedAt = new Date(Date.now() - 1000).toISOString();
    const known = creatorObservationSchema.safeParse({ value: 1500, source: 'synthetic:creator-qa:followers',
      observed_at: observedAt, synced_at: observedAt, status: 'available', confidence: 'HIGH' });
    assert.ok(known.success);
    const target = createTargetSchema.safeParse({ username: seed.target.username, platform: 'twitch',
      profileUrl: seed.target.profileUrl, followers: 1500, notes: 'SYNTHETIC incoming notes must not replace manual notes',
      discoveredVia: 'synthetic:creator-qa:provider' });
    assert.ok(target.success);
    const input = { externalId: `${fixturePrefix}_immutable`, runId: seed.firstRun.id,
      target: target.data, fields: { followers: known.data } };
    await assert.rejects(persistDiscoveredCreator(input), { message: 'creator_provider_storage_permission_required' });
    assert.equal((await db.select().from(s.creatorAccounts)).length, 0);
    await db.insert(s.creatorProviderPermissions).values({ platform: 'twitch', commercialApproved: true,
      derivedMetricsApproved: true, retentionDays: 1, reviewedBy: actorId, reviewedAt: new Date(Date.now() - 1000),
      validUntil: new Date(Date.now() + 3_600_000), evidenceRef: 'SYNTHETIC QA ONLY — NOT A REAL PROVIDER APPROVAL' });
    const initial = await persistDiscoveredCreator(input);
    assert.deepEqual(initial, { inserted: 0, updated: 1, represented: false, identityReview: false });
    const readAccount = async () => {
      const [row] = await db.select().from(s.creatorAccounts).where(and(eq(s.creatorAccounts.platform, 'twitch'),
        eq(s.creatorAccounts.externalId, input.externalId)));
      assert.ok(row, 'creator_qa_account_missing');
      return row;
    };
    const firstAccount = await readAccount();
    const replay = await persistDiscoveredCreator(input);
    assert.deepEqual(replay, { inserted: 0, updated: 0, represented: false, identityReview: false });
    assert.deepEqual(await readAccount(), firstAccount);
    assert.equal((await db.select().from(s.creatorAccountObservations)).length, 1);
    checks.push(stage);

    stage = 'renamed_identity_concurrency_and_last_good';
    const unavailable = creatorObservationSchema.safeParse({ ...known.data, value: null, observed_at: null,
      synced_at: new Date().toISOString(), status: 'unavailable', confidence: 'LOW' });
    assert.ok(unavailable.success);
    const renamed = createTargetSchema.safeParse({ ...target.data, username: `${fixturePrefix}_renamed`,
      followers: null, profileUrl: `https://example.invalid/${fixturePrefix}/renamed` });
    assert.ok(renamed.success);
    const nextInput = { ...input, runId: seed.secondRun.id, target: renamed.data, fields: { followers: unavailable.data } };
    const sameRun = await Promise.all([persistDiscoveredCreator(nextInput), persistDiscoveredCreator(nextInput)]);
    assert.equal(sameRun.reduce((total, result) => total + result.updated, 0), 1);
    assert.equal(sameRun.reduce((total, result) => total + result.inserted, 0), 0);
    const currentAccount = await readAccount();
    assert.equal(currentAccount.id, firstAccount.id);
    assert.equal(currentAccount.creatorId, firstAccount.creatorId);
    assert.equal(currentAccount.targetId, seed.target.id);
    assert.equal(currentAccount.username, renamed.data.username);
    assert.equal(currentAccount.timesObserved, 2);
    assert.equal(currentAccount.fields.followers?.value, 1500);
    const [savedTarget] = await db.select().from(s.targets).where(eq(s.targets.id, seed.target.id));
    assert.ok(savedTarget);
    assert.equal(savedTarget.notes, seed.target.notes);
    assert.equal(savedTarget.status, 'contactado');
    assert.equal(savedTarget.followers, 1500);
    assert.equal((await db.select().from(s.targets)).length, 1);
    const snapshots = await db.select().from(s.creatorAccountObservations).where(eq(s.creatorAccountObservations.accountId, currentAccount.id));
    assert.equal(snapshots.length, 2);
    assert.equal(snapshots.find((row) => row.runId === seed.secondRun.id)?.fields.followers?.value, null);
    const fresh = await persistDiscoveredCreator({ ...nextInput, externalId: `${fixturePrefix}_unknown`,
      target: { ...renamed.data, username: `${fixturePrefix}_unknown` } });
    assert.equal(fresh.inserted, 1);
    const [unknownTarget] = await db.select().from(s.targets).where(eq(s.targets.username, `${fixturePrefix}_unknown`));
    assert.ok(unknownTarget);
    assert.equal(unknownTarget.followers, null);
    checks.push(stage);

    stage = 'daily_budget_atomic_global_and_profile';
    const endpoint = 'https://www.googleapis.com/youtube/v3/search';
    const budgetBefore = creatorApiBudget(endpoint, 8, new Date());
    const budgetGuard = createCreatorBudgetGuard(fixturePrefix, 8);
    const reservations = await Promise.allSettled(Array.from({ length: 10 }, () => budgetGuard(endpoint)));
    assert.equal(creatorApiBudget(endpoint, 8, new Date()).bucketDay, budgetBefore.bucketDay, 'creator_qa_crossed_budget_midnight');
    assert.equal(reservations.filter((item) => item.status === 'fulfilled').length, 8);
    for (const item of reservations.filter((item) => item.status === 'rejected')) {
      assert.ok(item.reason instanceof Error);
      assert.equal(item.reason.message, 'creator_daily_budget_exhausted');
    }
    const usage = await db.select().from(s.creatorDailyApiUsage);
    assert.equal(usage.length, 2);
    assert.equal(usage.find((row) => row.budgetKey === 'global')?.reservedRequests, 8);
    assert.equal(usage.find((row) => row.budgetKey === `profile:${fixturePrefix}`)?.reservedRequests, 8);
    assert.ok(usage.every((row) => row.platform === 'youtube:search' && row.bucketDay === budgetBefore.bucketDay));
    checks.push(stage);

    stage = 'digest_outbox_enqueue_and_ack_idempotency';
    const eventKey = `creator-test:${fixturePrefix}`;
    const enqueued = await Promise.all(Array.from({ length: 3 }, () => digest.enqueueCreatorDigest(eventKey,
      'SYNTHETIC QA — no real Discord delivery; database acknowledgement only.', seed.firstRun.id)));
    assert.ok(enqueued.every(Boolean));
    const outbox = await db.select().from(s.creatorDigestOutbox).where(eq(s.creatorDigestOutbox.eventKey, eventKey));
    assert.equal(outbox.length, 1);
    const [row] = outbox;
    assert.ok(row);
    assert.equal(row.status, 'pending');
    assert.equal(await digest.acknowledgeCreatorDigest(row.id, { channelId: '100000000000000009', messageId }), 'conflict');
    const acknowledgements = await Promise.all(Array.from({ length: 3 }, () => digest.acknowledgeCreatorDigest(row.id, { channelId, messageId })));
    assert.equal(acknowledgements.filter((value) => value === 'acknowledged').length, 1);
    assert.equal(acknowledgements.filter((value) => value === 'duplicate').length, 2);
    assert.equal(await digest.acknowledgeCreatorDigest(row.id, { channelId, messageId }), 'duplicate');
    assert.equal(await digest.acknowledgeCreatorDigest(row.id, { channelId, messageId: '100000000000000008' }), 'conflict');
    const [sent] = await db.select().from(s.creatorDigestOutbox).where(eq(s.creatorDigestOutbox.id, row.id));
    assert.ok(sent);
    assert.equal(sent.status, 'sent');
    assert.equal(sent.messageId, messageId);
    assert.equal(sent.attempts, 1);
    checks.push(stage);
    stage = 'final_safety_checks';
    assert.equal(blockedHttpAttempts, 0, 'creator_qa_attempted_external_http');
    assert.equal((await readProfile()).enabled, false);
    checks.push(stage);
    console.log(JSON.stringify({ ok: true, synthetic: true, checks, blockedHttpAttempts,
      fixturesPreserved: true, realProviderOrDiscordTested: false }));
  } finally {
    // Closing the verifier releases the dedicated advisory lock even after failure.
    try { await closeApplicationPool?.(); } finally { await verifier.end(); }
  }
}

void main().catch(() => {
  console.error(JSON.stringify({ ok: false, synthetic: true, failedCheck: stage, completedChecks: checks,
    blockedHttpAttempts, fixturesPreserved: true, detail: 'No raw error, credentials or row contents are logged.' }));
  process.exitCode = 1;
});
