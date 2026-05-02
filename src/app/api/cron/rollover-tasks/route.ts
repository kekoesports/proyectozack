import { NextRequest, NextResponse } from 'next/server';
import { regenerateRecurringTasks, rollOverPendingTasks } from '@/lib/queries/crmTasks';
import { getIsoWeekLabel, previousWeek } from '@/lib/utils/week';
import { assertCronAuth } from '@/lib/security/assertCronAuth';

export const dynamic = 'force-dynamic';

/**
 * Cron endpoint — invoked weekly by Vercel Cron (configured in vercel.json).
 * Auth via {@link assertCronAuth} (fail-closed).
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const authError = assertCronAuth(req);
  if (authError) return authError;

  const curr = getIsoWeekLabel(new Date());
  const prev = previousWeek(curr);

  try {
    const { rolled } = await rollOverPendingTasks(prev, curr);
    const { generated } = await regenerateRecurringTasks({ weekLabel: curr });
    return NextResponse.json({ success: true, rolled, generated, from: prev, to: curr });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[rollover-tasks] error:', msg);
    return NextResponse.json({ success: false, error: msg, from: prev, to: curr }, { status: 500 });
  }
}
