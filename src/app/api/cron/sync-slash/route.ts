import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { assertCronAuth } from '@/lib/security/assertCronAuth';
import { SlashApiError } from '@/lib/integrations/slash/client';
import { SlashConfigurationError, syncSlashAccounting } from '@/lib/services/slash-accounting/sync';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

export async function GET(request: NextRequest): Promise<NextResponse> {
  const authError = assertCronAuth(request);
  if (authError) return authError;

  try {
    return NextResponse.json({ success: true, ...(await syncSlashAccounting()) });
  } catch (error) {
    const status = error instanceof SlashConfigurationError ? 503 : 502;
    const providerStatus = error instanceof SlashApiError ? error.status : undefined;
    console.error('[sync-slash] failed', {
      type: error instanceof Error ? error.name : 'UnknownError',
      providerStatus,
    });
    return NextResponse.json(
      { success: false, error: status === 503 ? 'Slash is not configured' : 'Slash sync failed' },
      { status },
    );
  }
}
