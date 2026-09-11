import { NextRequest, NextResponse } from 'next/server';
import { assertCronAuth } from '@/lib/security/assertCronAuth';
import { env } from '@/lib/env';
import { db } from '@/lib/db';
import { syncTaskNotices } from '@/lib/quick-notes/notices';
export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest) {
  const denied = assertCronAuth(request);
  if (denied) return denied;
  if (!env.QUICK_NOTES_ENABLED) return NextResponse.json({ enabled: false });
  try {
    return NextResponse.json({ enabled: true, ...(await syncTaskNotices(db)) });
  } catch {
    return NextResponse.json(
      { error: 'Task notice synchronization failed' },
      { status: 500 },
    );
  }
}
