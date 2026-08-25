import { NextResponse } from 'next/server';

import { verifyAutomationToken } from '@/lib/security/assertAutomationAuth';
import {
  formatTrackingReminderForDiscord,
  processStaleDealTrackingReminders,
} from '@/lib/services/dealTrackingReminders';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

export async function POST(req: Request): Promise<NextResponse> {
  const auth = verifyAutomationToken(req);
  if (!auth.ok) {
    return NextResponse.json(
      { ok: false, error: auth.reason },
      { status: auth.reason === 'missing-config' ? 503 : 401 },
    );
  }

  try {
    const reminders = await processStaleDealTrackingReminders();
    return NextResponse.json({
      ok: true,
      total: reminders.length,
      reminders: reminders.map((reminder) => ({
        ...reminder,
        message: formatTrackingReminderForDiscord(reminder),
      })),
    });
  } catch {
    console.error('[automation-deal-reminders] batch failed');
    return NextResponse.json({ ok: false, error: 'internal-error' }, { status: 500 });
  }
}
