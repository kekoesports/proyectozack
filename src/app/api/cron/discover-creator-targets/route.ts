import { NextRequest, NextResponse } from 'next/server';

import { assertCronAuth } from '@/lib/security/assertCronAuth';
import { runCreatorTargetDiscovery } from '@/lib/services/creatorTargetDiscovery';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function GET(request: NextRequest): Promise<NextResponse> {
  const authError = assertCronAuth(request);
  if (authError) return authError;

  const result = await runCreatorTargetDiscovery('scheduled');
  return NextResponse.json({ success: result.status !== 'failed', ...result }, {
    status: result.status === 'failed' ? 503 : 200,
  });
}
