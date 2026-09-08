import { NextRequest, NextResponse } from 'next/server';

import { syncCreatorApplicationsToSheet } from '@/lib/integrations/creatorApplicationsSheet';
import { listInboundCreatorApplications } from '@/lib/queries/inboundCreatorApplications';
import { assertCronAuth } from '@/lib/security/assertCronAuth';
import { markCreatorOutreachNoResponse } from '@/lib/queries/creatorOutreach';
import { processCreatorOutreachAutomation } from '@/lib/email/creatorOutreachAutomation';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/** Archiva candidaturas nuevas y enriquece su plataforma principal una vez al día. */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const authError = assertCronAuth(request);
  if (authError) return authError;

  try {
    const noResponse = await markCreatorOutreachNoResponse();
    const applications = await listInboundCreatorApplications();
    const outreach = await processCreatorOutreachAutomation(applications);
    // Releer después de los envíos para que el Excel refleje el estado en la
    // misma ejecución, no al día siguiente.
    const refreshedApplications = await listInboundCreatorApplications();
    const result = await syncCreatorApplicationsToSheet(refreshedApplications);
    console.log('[sync-creator-applications] done', { ...result, noResponse, outreach });
    return NextResponse.json({ ok: true, ...result, noResponse, outreach });
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'unknown-error';
    console.error('[sync-creator-applications] failed', { reason });
    return NextResponse.json({ ok: false, error: reason }, { status: 500 });
  }
}
