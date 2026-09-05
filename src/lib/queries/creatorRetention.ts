import { and, asc, eq, exists, isNotNull, isNull, lte, ne, or, sql } from 'drizzle-orm';
import { creatorAccounts, creatorAccountObservations, creatorProviderPermissions, targets } from '@/db/schema';
import { db } from '@/lib/db';
import { creatorMetricMirrors, nextCreatorExpiry, retainCreatorFields } from '@/lib/targets/creator-retention';
import { normalizeCreatorAccountKey } from '@/lib/targets/search-profile';

/** Bounded payload cleanup. Rows remain as identity/history/replay markers; never contact a provider. */
export async function expireCreatorMetricPayloads(): Promise<{
  status: 'success' | 'partial'; processedAccounts: number; clearedSnapshots: number; errors: number;
}> {
  const started = Date.now(), dueAt = new Date();
  const snapshotDue = db.select({ id: creatorAccountObservations.id }).from(creatorAccountObservations)
    .where(and(eq(creatorAccountObservations.accountId, creatorAccounts.id), or(lte(creatorAccountObservations.expiresAt, dueAt),
      sql`exists (select 1 from jsonb_each(${creatorAccountObservations.fields}) as retained_snapshot
        where retained_snapshot.value ->> 'value' is not null and (retained_snapshot.value ->> 'expires_at' is null
          or retained_snapshot.value ->> 'retention_days' is distinct from ${creatorProviderPermissions.retentionDays}::text))`),
      sql`${creatorAccountObservations.fields} <> '{}'::jsonb`));
  const orphanedMirror = db.select({ id: targets.id }).from(targets).where(and(eq(targets.id, creatorAccounts.targetId),
    or(isNotNull(targets.followers), isNotNull(targets.following), isNotNull(targets.posts), isNotNull(targets.bio),
      isNotNull(targets.profilePicUrl), isNotNull(targets.recentVideoCount), ne(targets.fitScore, 0), sql`${targets.fitReasons} <> '[]'::jsonb`)));
  // JSON metadata, not unsafe timestamp casts: includes legacy fields and a shortened recorded policy.
  const policyChanged = sql`exists (select 1 from jsonb_each(${creatorAccounts.fields}) as retained_field
    where retained_field.value ->> 'value' is not null and (retained_field.value ->> 'expires_at' is null
      or retained_field.value ->> 'retention_days' is distinct from ${creatorProviderPermissions.retentionDays}::text))`;
  const candidates = await db.select({ id: creatorAccounts.id, platform: creatorAccounts.platform, externalId: creatorAccounts.externalId })
    .from(creatorAccounts).leftJoin(creatorProviderPermissions, eq(creatorProviderPermissions.platform, creatorAccounts.platform))
    .where(or(and(sql`${creatorAccounts.fields} <> '{}'::jsonb`,
      or(isNull(creatorAccounts.expiresAt), lte(creatorAccounts.expiresAt, dueAt), policyChanged)), exists(snapshotDue),
    and(sql`${creatorAccounts.fields} = '{}'::jsonb`, exists(orphanedMirror))))
    .orderBy(asc(creatorAccounts.id)).limit(11);
  let processedAccounts = 0, clearedSnapshots = 0, errors = 0;
  let snapshotBacklog = false;
  for (const candidate of candidates.slice(0, 10)) {
    if (Date.now() - started >= 20_000) break;
    try {
      clearedSnapshots += await db.transaction(async (tx) => {
        await tx.execute(sql`set local statement_timeout = '20s'`);
        await tx.execute(sql`set local transaction_timeout = '25s'`);
        await tx.execute(sql`set local lock_timeout = '5s'`);
        // Exactly the writer's lock/key/order. Reselect AFTER locking: a refresh may have won the race.
        await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${normalizeCreatorAccountKey(candidate.platform, candidate.externalId)}))`);
        const [account] = await tx.select().from(creatorAccounts).where(eq(creatorAccounts.id, candidate.id));
        if (!account) return 0;
        const [permission] = await tx.select({ retentionDays: creatorProviderPermissions.retentionDays })
          .from(creatorProviderPermissions).where(eq(creatorProviderPermissions.platform, account.platform));
        const now = new Date();
        const fields = retainCreatorFields({ fields: account.fields, expiresAt: account.expiresAt,
          retentionDays: permission?.retentionDays ?? null }, now);
        if (account.targetId) {
          // Same target row lock as ingestion; no workflow/contact/identity field is changed.
          const [target] = await tx.select({ qualificationStatus: targets.qualificationStatus }).from(targets)
            .where(eq(targets.id, account.targetId)).for('update');
          await tx.update(targets).set(creatorMetricMirrors(fields, target?.qualificationStatus)).where(eq(targets.id, account.targetId));
        }
        await tx.update(creatorAccounts).set({ fields, expiresAt: nextCreatorExpiry(fields) }).where(eq(creatorAccounts.id, account.id));
        const snapshots = await tx.select().from(creatorAccountObservations).where(and(
          eq(creatorAccountObservations.accountId, account.id), or(lte(creatorAccountObservations.expiresAt, now),
          sql`exists (select 1 from jsonb_each(${creatorAccountObservations.fields}) as retained_snapshot
            where retained_snapshot.value ->> 'value' is not null and (retained_snapshot.value ->> 'expires_at' is null
              or retained_snapshot.value ->> 'retention_days' is distinct from ${permission?.retentionDays ?? null}::text))`),
          sql`${creatorAccountObservations.fields} <> '{}'::jsonb`)).orderBy(asc(creatorAccountObservations.id)).limit(101);
        if (snapshots.length > 100) snapshotBacklog = true;
        for (const snapshot of snapshots.slice(0, 100)) {
          const retained = retainCreatorFields({ fields: snapshot.fields, expiresAt: snapshot.expiresAt,
            retentionDays: permission?.retentionDays ?? null }, now);
          await tx.update(creatorAccountObservations).set({ fields: retained,
            expiresAt: nextCreatorExpiry(retained) ?? snapshot.expiresAt }).where(eq(creatorAccountObservations.id, snapshot.id));
        }
        return Math.min(snapshots.length, 100);
      });
      processedAccounts++;
    } catch { errors++; } // Sanitized counters only; never log provider payloads or database errors.
  }
  return { status: errors || snapshotBacklog || processedAccounts < candidates.length ? 'partial' : 'success', processedAccounts, clearedSnapshots, errors };
}
