import { eq, inArray } from 'drizzle-orm';
import { creatorAccounts, creatorProviderPermissions } from '@/db/schema';
import { db } from '@/lib/db';
import type { Target } from '@/types';
import { projectCreatorTarget, type TargetView } from '@/lib/targets/creator-retention';

/** One projection shared by admin, CSV export, brand portal and refresh API. No provider calls. */
export async function applyCreatorRetention(rows: readonly Target[], now = new Date()): Promise<TargetView[]> {
  if (!rows.length) return [];
  const accounts = await db.select({ targetId: creatorAccounts.targetId, fields: creatorAccounts.fields,
    expiresAt: creatorAccounts.expiresAt, retentionDays: creatorProviderPermissions.retentionDays })
    .from(creatorAccounts).leftJoin(creatorProviderPermissions, eq(creatorProviderPermissions.platform, creatorAccounts.platform))
    .where(inArray(creatorAccounts.targetId, rows.map((row) => row.id)));
  const byTarget = new Map(accounts.map((account) => [account.targetId, account]));
  return rows.map((row) => projectCreatorTarget(row, byTarget.get(row.id), now));
}
