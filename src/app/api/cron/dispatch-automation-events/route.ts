import { type NextRequest, NextResponse } from 'next/server';
import { dispatchAutomationEvents } from '@/lib/automation/outbox';
import { assertCronAuth } from '@/lib/security/assertCronAuth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const authError = assertCronAuth(request);
  if (authError) return authError;
  try {
    const result = await dispatchAutomationEvents();
    if (!result.configured) {
      return NextResponse.json(
        { success: false, error: 'Automation dispatcher is not configured' },
        { status: 503 },
      );
    }
    return NextResponse.json({ success: true, ...result });
  } catch {
    console.error('[dispatch-automation-events] dispatch failed');
    return NextResponse.json({ success: false, error: 'Dispatch failed' }, { status: 500 });
  }
}
