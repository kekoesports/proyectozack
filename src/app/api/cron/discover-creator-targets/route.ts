import { cronMaintenanceSchema } from '@/lib/schemas/cron-maintenance';
import { NextRequest, NextResponse } from 'next/server';

import { assertCronAuth } from '@/lib/security/assertCronAuth';
import { runDueCreatorSearchProfiles } from '@/lib/services/creatorSearchProfiles';
import { repairCreatorDiscoveryReporting } from '@/lib/services/creator-reporting-recovery';
import { expireCreatorMetricPayloads } from '@/lib/queries/creatorRetention';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function GET(request: NextRequest): Promise<NextResponse> {
  const authError = assertCronAuth(request);
  if (authError) return authError;
  const parsed = cronMaintenanceSchema.safeParse({ maintenance: request.nextUrl.searchParams.get('maintenance') ?? undefined });
  if (!parsed.success) return NextResponse.json({ success: false, error: 'Invalid maintenance option' }, { status: 400 });

  // Scheduled collection can run independently of retention and historical delivery recovery.
  const skipMaintenance = parsed.data.maintenance === 'skip';
  const retention = skipMaintenance ? { status: 'skipped' as const } : await expireCreatorMetricPayloads();
  const reportingRecovery = skipMaintenance ? { status: 'skipped' as const } : await repairCreatorDiscoveryReporting();
  const results = await runDueCreatorSearchProfiles();
  const success = retention.status !== 'partial' && reportingRecovery.status !== 'partial' && results.every((result) => result.ok && result.error === null);
  return NextResponse.json({ success, retention, reportingRecovery, processedProfiles: results.length, results }, { status: success ? 200 : 503 });
}
