import { and, eq, inArray, sql } from 'drizzle-orm';
import { creatorAccounts, creatorIdentities, talentSocials, targets, creatorProviderPermissions, creatorAccountObservations } from '@/db/schema';
import { db } from '@/lib/db';
import { bulkUpsertTargets } from '@/lib/queries/targets';
import { createTargetSchema, type CreateTargetInput } from '@/lib/schemas/target';
import { type CreatorObservation, type CreatorSearchConfig } from '@/lib/schemas/creator-search-profile';
import { normalizeCreatorAccountKey } from '@/lib/targets/search-profile';
import { creatorMetricMirrors, nextCreatorExpiry } from '@/lib/targets/creator-retention';
import { prepareRetainedCreatorFields } from '@/lib/targets/creator-retention-storage';
import { creatorProviderGate } from '@/lib/targets/provider-readiness';
import { reevaluateDiscardedCreator } from './creatorDiscardReevaluation';

export type DiscoveredCreatorInput = Readonly<{
  runId?: number;
  searchConfig?: CreatorSearchConfig;
  externalId: string;
  target: CreateTargetInput;
  fields: Readonly<Record<string, CreatorObservation>>;
}>;

/** Provider ID is authoritative. Existing roster ownership is the only automatic cross-network link. */
export async function persistDiscoveredCreator(input: DiscoveredCreatorInput): Promise<{
  inserted: number; updated: number; represented: boolean; identityReview: boolean; suppressed?: boolean; reopened?: boolean;
}> {
  const data = createTargetSchema.parse(input.target);
  if (input.runId !== undefined && (!Number.isSafeInteger(input.runId) || input.runId < 1)) throw new Error('creator_run_id_invalid');
  if (!input.externalId || input.externalId.length > 200) throw new Error('creator_provider_id_invalid');
  const key = normalizeCreatorAccountKey(data.platform, input.externalId);
  return db.transaction(async (tx) => {
    await tx.execute(sql`set local statement_timeout = '20s'`);
    await tx.execute(sql`set local transaction_timeout = '25s'`);
    await tx.execute(sql`set local lock_timeout = '5s'`);
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${key}))`);
    const [permission] = await tx.select().from(creatorProviderPermissions).where(eq(creatorProviderPermissions.platform, data.platform));
    if (!permission || !creatorProviderGate(data.platform, true, permission, new Date()).ready) {
      throw new Error('creator_provider_storage_permission_required');
    }
    const [account] = await tx.select().from(creatorAccounts).where(and(
      eq(creatorAccounts.platform, data.platform), eq(creatorAccounts.externalId, input.externalId),
    ));
    const username = data.platform === 'youtube' ? data.username : data.username.toLowerCase();
    const [existingTarget] = account?.targetId
      ? await tx.select().from(targets).where(eq(targets.id, account.targetId)).for('update')
      : await tx.select().from(targets).where(and(eq(targets.platform, data.platform),
        data.platform === 'youtube' ? eq(targets.username, username) : sql`lower(${targets.username}) = ${username}`)).limit(1).for('update');
    if (account && input.runId) {
      const [observation] = await tx.select({ id: creatorAccountObservations.id }).from(creatorAccountObservations)
        .where(and(eq(creatorAccountObservations.accountId, account.id), eq(creatorAccountObservations.runId, input.runId))).limit(1);
      if (observation) return { inserted: 0, updated: 0, represented: account.targetId === null, identityReview: false,
        ...(existingTarget?.status === 'descartado' ? { suppressed: true, reopened: false } : {}) };
    }
    if (existingTarget && !account) {
      const [otherIdentity] = await tx.select().from(creatorAccounts).where(eq(creatorAccounts.targetId, existingTarget.id));
      // Recycled handle or conflicting provider IDs: do not merge or overwrite its history.
      if (otherIdentity && otherIdentity.externalId !== input.externalId) return { inserted: 0, updated: 0, represented: false, identityReview: true };
    }
    const [representedSocial] = await tx.select({ talentId: talentSocials.talentId }).from(talentSocials)
      .where(and(inArray(talentSocials.platform, data.platform === 'youtube' ? ['youtube', 'yt']
        : data.platform === 'twitch' ? ['twitch', 'tw'] : data.platform === 'instagram' ? ['instagram', 'ig'] : ['kick']),
      eq(talentSocials.platformId, input.externalId))).limit(1);
    if (representedSocial) await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${'creator-talent:' + representedSocial.talentId}))`);
    const [rosterIdentity] = representedSocial
      ? await tx.select().from(creatorIdentities).where(eq(creatorIdentities.talentId, representedSocial.talentId)).limit(1) : [];
    if (account && rosterIdentity && account.creatorId !== rosterIdentity.id) {
      return { inserted: 0, updated: 0, represented: true, identityReview: true };
    }
    const source = data.discoveredVia ?? `official:${data.platform}`;
    const now = new Date();
    let creatorId = account?.creatorId ?? rosterIdentity?.id;
    if (!creatorId) {
      const [identity] = await tx.insert(creatorIdentities).values({ displayName: data.fullName ?? username,
        talentId: representedSocial?.talentId, sourceFirstSeen: source, sourceLastSeen: source,
        firstSeenAt: existingTarget?.createdAt ?? now }).returning({ id: creatorIdentities.id });
      if (!identity) throw new Error('creator_identity_insert_failed');
      creatorId = identity.id;
    } else {
      await tx.update(creatorIdentities).set({ lastSeenAt: now, sourceLastSeen: source,
        timesObserved: sql`${creatorIdentities.timesObserved} + 1` }).where(eq(creatorIdentities.id, creatorId));
    }
    const { fields, observedFields } = prepareRetainedCreatorFields({ fields: account?.fields ?? {},
      expiresAt: account?.expiresAt ?? null, retentionDays: permission.retentionDays }, input.fields, data, now);
    // Keep represented creators out of the prospect funnel. Existing targets retain their manual status.
    const result = representedSocial && !existingTarget ? { inserted: 0, updated: 0, ids: [] }
      : await bulkUpsertTargets([{ ...data, username: existingTarget?.username ?? username }], tx);
    const wasDiscarded = existingTarget?.status === 'descartado';
    const reopened = wasDiscarded && account && !representedSocial
      ? await reevaluateDiscardedCreator(tx, existingTarget, account, input, now) : false;
    const targetId = result.ids[0] ?? existingTarget?.id ?? null;
    // Generic CSV upsert deliberately preserves nulls; official mirrors must not resurrect expired data.
    if (targetId) await tx.update(targets).set(creatorMetricMirrors(fields, data.qualificationStatus ?? existingTarget?.qualificationStatus)).where(eq(targets.id, targetId));
    const values = { creatorId, targetId, platform: data.platform, externalId: input.externalId, username,
      profileUrl: data.profileUrl, fields, lastSeenAt: now,
      expiresAt: nextCreatorExpiry(fields),
      identityEvidence: { confidence: 'HIGH', source: representedSocial ? 'crm:talent_socials:platform_id' : `official:${data.platform}:id`,
        reason: representedSocial ? 'ID inmutable ya asociado al talento en el CRM' : 'Misma cuenta por ID inmutable; no fusión por nombre' } as const };
    let accountId = account?.id;
    if (account) await tx.update(creatorAccounts).set({ ...values, timesObserved: sql`${creatorAccounts.timesObserved} + 1` }).where(eq(creatorAccounts.id, account.id));
    else {
      const [inserted] = await tx.insert(creatorAccounts).values({ ...values, firstSeenAt: existingTarget?.createdAt ?? now }).returning({ id: creatorAccounts.id });
      accountId = inserted?.id;
    }
    if (input.runId && accountId) await tx.insert(creatorAccountObservations).values({ accountId, runId: input.runId,
      fields: observedFields, observedAt: now, expiresAt: nextCreatorExpiry(observedFields) ?? now }).onConflictDoNothing({ target: [creatorAccountObservations.accountId, creatorAccountObservations.runId] });
    return { inserted: result.inserted, updated: result.updated, represented: !!representedSocial, identityReview: false,
      ...(wasDiscarded ? { suppressed: !reopened, reopened } : {}) };
  });
}
