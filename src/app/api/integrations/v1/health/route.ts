import { type NextRequest } from 'next/server';
import { authorizeIntegrationRequest } from '@/lib/integrations/auth';
import { integrationSuccess } from '@/lib/integrations/responses';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = await authorizeIntegrationRequest(request);
  if (!auth.ok) return auth.response;
  return integrationSuccess({ service: 'socialpro-integrations', version: 'v1', status: 'ok' }, auth.traceId);
}
