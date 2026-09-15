import { NextRequest, NextResponse } from 'next/server';
import { assertCronAuth } from '@/lib/security/assertCronAuth';
import { processSocialChannel } from '@/lib/news-social/processor';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 90;

export async function GET(request: NextRequest) {
  const denied = assertCronAuth(request);
  if (denied) return denied;
  // Channels fail independently: a broken token must not block the other destination.
  const results = await Promise.allSettled([processSocialChannel('x'), processSocialChannel('instagram')]);
  return NextResponse.json({
    x: results[0]?.status === 'fulfilled' ? results[0].value : 'internal_error',
    instagram: results[1]?.status === 'fulfilled' ? results[1].value : 'internal_error',
  }, { status: results.some(result => result.status === 'rejected') ? 503 : 200 });
}
