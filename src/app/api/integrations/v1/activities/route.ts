import { type NextRequest } from 'next/server';
import { authorizeIntegrationRequest } from '@/lib/integrations/auth';
import { runIdempotentMutation } from '@/lib/integrations/idempotency';
import { firstIssue, parseJsonWithSchema } from '@/lib/integrations/request';
import { integrationError, integrationSuccess } from '@/lib/integrations/responses';
import { createAutomationActivity, listAutomationActivities } from '@/lib/queries/automation/activities';
import { ActivityCreate, ActivityListQuery } from '@/lib/schemas/integrationApi';

export async function GET(request: NextRequest) {
  const auth = await authorizeIntegrationRequest(request);
  if (!auth.ok) return auth.response;
  const parsed = ActivityListQuery.safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!parsed.success) return integrationError(400, 'invalid_request', firstIssue(parsed.error), auth.traceId);
  return integrationSuccess(await listAutomationActivities(parsed.data), auth.traceId);
}

export async function POST(request: NextRequest) {
  const auth = await authorizeIntegrationRequest(request);
  if (!auth.ok) return auth.response;
  const parsed = await parseJsonWithSchema(request, ActivityCreate);
  if (!parsed.success) return integrationError(400, 'invalid_request', parsed.message, auth.traceId);
  return runIdempotentMutation({
    request,
    route: '/api/integrations/v1/activities',
    input: parsed.data,
    traceId: auth.traceId,
    execute: async () => {
      const result = await createAutomationActivity(parsed.data);
      return {
        status: result.created ? 201 : 200,
        body: { ok: true, data: result.activity, traceId: auth.traceId },
      };
    },
  });
}
