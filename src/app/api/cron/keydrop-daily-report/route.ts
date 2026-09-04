import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { sendKeydropDiscordReport } from '@/lib/discord/keydropDailyReport';
import { env } from '@/lib/env';
import { getKeydropDailyReports } from '@/lib/queries/keydropDailyReport';
import { assertCronAuth } from '@/lib/security/assertCronAuth';

export const dynamic = 'force-dynamic';

/** Publica una vez al día los participantes reportados por la API de KeyDrop. */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const authError = assertCronAuth(request);
  if (authError) return authError;

  const webhookUrl = env.KEYDROP_DAILY_DISCORD_WEBHOOK_URL;
  if (!webhookUrl) {
    console.warn('[keydrop-daily-report] Discord webhook not configured');
    return NextResponse.json({ success: false, error: 'Discord webhook not configured' }, { status: 503 });
  }

  const reports = await getKeydropDailyReports();
  const delivery = await sendKeydropDiscordReport(webhookUrl, reports);
  if (!delivery.ok) {
    console.warn(`[keydrop-daily-report] Discord delivery failed${delivery.status ? ` http_${delivery.status}` : ''}`);
    return NextResponse.json({ success: false, error: 'Discord delivery failed' }, { status: 502 });
  }

  const activeGiveaways = reports.reduce((total, report) => total + report.activeGiveawayCount, 0);
  const accumulatedParticipants = reports.reduce((total, report) => total + report.accumulatedParticipants, 0);
  console.info(`[keydrop-daily-report] creators=${reports.length} active=${activeGiveaways} messages=${delivery.messagesSent}`);

  return NextResponse.json({
    success: true,
    creators: reports.length,
    activeGiveaways,
    accumulatedParticipants,
    messagesSent: delivery.messagesSent,
  });
}
