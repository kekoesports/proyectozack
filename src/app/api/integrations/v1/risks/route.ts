import { type NextRequest } from 'next/server';
import { authorizeIntegrationRequest } from '@/lib/integrations/auth';
import { firstIssue } from '@/lib/integrations/request';
import { integrationError, integrationSuccess } from '@/lib/integrations/responses';
import { listAutomationRisks } from '@/lib/queries/automation/context';
import { RiskListQuery } from '@/lib/schemas/integrationApi';

export async function GET(request: NextRequest) {
  const auth = await authorizeIntegrationRequest(request);
  if (!auth.ok) return auth.response;
  const parsed = RiskListQuery.safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!parsed.success) return integrationError(400, 'invalid_request', firstIssue(parsed.error), auth.traceId);
  return integrationSuccess(
    await listAutomationRisks(parsed.data.severity, parsed.data.limit, parsed.data.offset),
    auth.traceId,
  );
}
