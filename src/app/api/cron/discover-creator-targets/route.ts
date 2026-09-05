import { NextRequest, NextResponse } from 'next/server';

import { assertCronAuth } from '@/lib/security/assertCronAuth';
import { runDueCreatorSearchProfiles } from '@/lib/services/creatorSearchProfiles';
import { repairCreatorDiscoveryReporting } from '@/lib/services/creator-reporting-recovery';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function GET(request: NextRequest): Promise<NextResponse> {
  const authError = assertCronAuth(request);
  if (authError) return authError;

  const reportingRecovery = await repairCreatorDiscoveryReporting();
  const results = await runDueCreatorSearchProfiles();
  const success = reportingRecovery.status !== 'partial' && results.every((result) => result.ok);
  return NextResponse.json({ success, reportingRecovery, processedProfiles: results.length, results }, { status: success ? 200 : 503 });
}
