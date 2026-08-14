import { type NextRequest } from 'next/server';
import { authorizeIntegrationRequest } from '@/lib/integrations/auth';
import { integrationSuccess } from '@/lib/integrations/responses';
import { getAutomationExecutiveSummary } from '@/lib/queries/automation/context';

export async function GET(request: NextRequest) {
  const auth = await authorizeIntegrationRequest(request);
  if (!auth.ok) return auth.response;
  return integrationSuccess(await getAutomationExecutiveSummary(), auth.traceId);
}
