import { env } from '@/lib/env';
import { listCreatorRunsPendingReporting } from '@/lib/queries/creatorDiscoveryRecovery';
import { recordCreatorRunReporting } from '@/lib/queries/creatorDiscoveryReporting';
import { creatorDiscoveryRolloutAtSchema } from '@/lib/schemas/creator-reporting-recovery';

export type CreatorReportingRecoveryResult = Readonly<{
  status: 'skipped' | 'success' | 'partial'; scanned: number; repaired: number;
  code: 'rollout_cutoff_required' | 'invalid_rollout_cutoff' | 'rollout_not_started'
    | 'digest_not_configured' | 'recovery_read_failed' | 'invalid_stored_run' | 'reporting_pending' | null;
}>;

/** Rebuild reporting from terminal records only. No imports of discovery or provider clients. */
export async function repairCreatorDiscoveryReporting(): Promise<CreatorReportingRecoveryResult> {
  const skip = (code: CreatorReportingRecoveryResult['code']): CreatorReportingRecoveryResult => ({
    status: 'skipped', scanned: 0, repaired: 0, code,
  });
  if (!env.CREATOR_DISCOVERY_ROLLOUT_AT) return skip('rollout_cutoff_required');
  const parsed = creatorDiscoveryRolloutAtSchema.safeParse(env.CREATOR_DISCOVERY_ROLLOUT_AT);
  if (!parsed.success) return skip('invalid_rollout_cutoff');
  const since = new Date(parsed.data), now = new Date();
  if (since > now) return skip('rollout_not_started');
  if (!env.DISCORD_CREATOR_DISCOVERY_CHANNEL_ID || !env.DISCORD_CREATOR_DISCOVERY_GUILD_ID) return skip('digest_not_configured');
  let rows: Awaited<ReturnType<typeof listCreatorRunsPendingReporting>>;
  try { rows = await listCreatorRunsPendingReporting(since, now); }
  catch { return { status: 'partial', scanned: 0, repaired: 0, code: 'recovery_read_failed' }; }
  let repaired = 0, scanned = 0;
  // SQL already orders/bounds this; sorting defensively also keeps isolated adapters honest.
  const ordered = [...rows].sort((a, b) => a.startedAt.getTime() - b.startedAt.getTime() || a.id - b.id).slice(0, 5);
  for (const run of ordered) {
    scanned += 1;
    if (!run.completedAt || run.startedAt < since || run.completedAt > now || run.startedAt > run.completedAt
      || !['success', 'partial', 'failed'].includes(run.status)) {
      return { status: 'partial', scanned, repaired, code: 'invalid_stored_run' };
    }
    try {
      await recordCreatorRunReporting(run.id, run.startedAt, run.platformResults, { completedAt: run.completedAt, recovered: true });
      repaired += 1;
    } catch {
      // Preserve the same run/event identity for the next repair. Never repeat the discovery.
      return { status: 'partial', scanned, repaired, code: 'reporting_pending' };
    }
  }
  return { status: 'success', scanned, repaired, code: null };
}
