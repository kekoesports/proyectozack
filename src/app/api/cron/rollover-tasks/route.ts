import { NextRequest, NextResponse } from 'next/server';
import { regenerateRecurringTasks, rollOverPendingTasks } from '@/lib/queries/crmTasks';
import { getIsoWeekLabel, previousWeek } from '@/lib/week';

export const dynamic = 'force-dynamic';

/**
 * Cron endpoint — invoked weekly by Vercel Cron (configured in vercel.json).
 *
 * Auth: requires either:
 *   - `Authorization: Bearer ${CRON_SECRET}` (preferred — works on any platform)
 *   - `x-vercel-cron: 1` (set by Vercel's platform, stripped from inbound user requests)
 *
 * Fail-closed: if `CRON_SECRET` is missing AND the request is not from Vercel cron,
 * return 503 to avoid an unauthenticated mass-mutation vector.
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const authHeader = req.headers.get('authorization');
  const vercelCronHeader = req.headers.get('x-vercel-cron');
  const cronSecret = process.env.CRON_SECRET;

  const isVercelCron = vercelCronHeader === '1';
  const hasValidSecret = Boolean(cronSecret) && authHeader === `Bearer ${cronSecret}`;

  if (!isVercelCron && !hasValidSecret) {
    if (!cronSecret) {
      console.error('[rollover-tasks] CRON_SECRET not configured — refusing to run');
      return NextResponse.json({ error: 'Service misconfigured' }, { status: 503 });
    }
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

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
