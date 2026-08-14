import { type NextRequest } from 'next/server';
import { authorizeIntegrationRequest } from '@/lib/integrations/auth';
import { firstIssue } from '@/lib/integrations/request';
import { integrationError, integrationSuccess } from '@/lib/integrations/responses';
import { lookupAutomationEntity } from '@/lib/queries/automation/context';
import { LookupQuery } from '@/lib/schemas/integrationApi';

export async function GET(request: NextRequest) {
  const auth = await authorizeIntegrationRequest(request);
  if (!auth.ok) return auth.response;
  const parsed = LookupQuery.safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!parsed.success) return integrationError(400, 'invalid_request', firstIssue(parsed.error), auth.traceId);
  const entity = await lookupAutomationEntity(parsed.data.entityType, parsed.data.id);
  if (!entity) return integrationError(404, 'not_found', 'Entity not found', auth.traceId);
  return integrationSuccess({ entityType: parsed.data.entityType, entity }, auth.traceId);
}
