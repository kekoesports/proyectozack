import { NextRequest, NextResponse } from 'next/server';

import { syncCreatorApplicationsToSheet } from '@/lib/integrations/creatorApplicationsSheet';
import { listInboundCreatorApplications } from '@/lib/queries/inboundCreatorApplications';
import { assertCronAuth } from '@/lib/security/assertCronAuth';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/** Archiva candidaturas nuevas y enriquece su plataforma principal una vez al día. */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const authError = assertCronAuth(request);
  if (authError) return authError;

  try {
    const applications = await listInboundCreatorApplications();
    const result = await syncCreatorApplicationsToSheet(applications);
    console.log('[sync-creator-applications] done', result);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'unknown-error';
    console.error('[sync-creator-applications] failed', { reason });
    return NextResponse.json({ ok: false, error: reason }, { status: 500 });
  }
}
