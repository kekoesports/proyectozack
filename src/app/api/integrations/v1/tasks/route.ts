import { type NextRequest } from 'next/server';
import { authorizeIntegrationRequest } from '@/lib/integrations/auth';
import { runIdempotentMutation } from '@/lib/integrations/idempotency';
import { firstIssue, parseJsonWithSchema } from '@/lib/integrations/request';
import { integrationError, integrationSuccess } from '@/lib/integrations/responses';
import { createAutomationTask, listAutomationTasks } from '@/lib/queries/automation/workItems';
import { TaskCreate, TaskListQuery } from '@/lib/schemas/integrationApi';

export async function GET(request: NextRequest) {
  const auth = await authorizeIntegrationRequest(request);
  if (!auth.ok) return auth.response;
  const parsed = TaskListQuery.safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!parsed.success) return integrationError(400, 'invalid_request', firstIssue(parsed.error), auth.traceId);
  return integrationSuccess(await listAutomationTasks(parsed.data), auth.traceId);
}

export async function POST(request: NextRequest) {
  const auth = await authorizeIntegrationRequest(request);
  if (!auth.ok) return auth.response;
  const parsed = await parseJsonWithSchema(request, TaskCreate);
  if (!parsed.success) return integrationError(400, 'invalid_request', parsed.message, auth.traceId);
  return runIdempotentMutation({
    request,
    route: '/api/integrations/v1/tasks',
    input: parsed.data,
    traceId: auth.traceId,
    execute: async () => ({
      status: 201,
      body: { ok: true, data: await createAutomationTask(parsed.data), traceId: auth.traceId },
    }),
  });
}
