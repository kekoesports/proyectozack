import { NextRequest, NextResponse } from 'next/server';

import { assertCronAuth } from '@/lib/security/assertCronAuth';
import { syncGithubIpEvidence } from '@/lib/services/ipEvidenceGithubSync';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(request: NextRequest): Promise<NextResponse> {
  const authError = assertCronAuth(request);
  if (authError) return authError;

  const result = await syncGithubIpEvidence();
  return NextResponse.json(
    { success: result.errors === 0, ...result },
    { status: result.errors === 0 ? 200 : 503 },
  );
}
