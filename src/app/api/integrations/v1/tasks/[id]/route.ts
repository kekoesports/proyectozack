import { type NextRequest } from 'next/server';
import { authorizeIntegrationRequest } from '@/lib/integrations/auth';
import { runIdempotentMutation } from '@/lib/integrations/idempotency';
import { firstIssue, parseJsonWithSchema } from '@/lib/integrations/request';
import { integrationError } from '@/lib/integrations/responses';
import { patchAutomationTask } from '@/lib/queries/automation/workItems';
import { NumericIdParam, TaskPatch } from '@/lib/schemas/integrationApi';

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await authorizeIntegrationRequest(request);
  if (!auth.ok) return auth.response;
  const id = NumericIdParam.safeParse(await context.params);
  if (!id.success) return integrationError(400, 'invalid_request', firstIssue(id.error), auth.traceId);
  const parsed = await parseJsonWithSchema(request, TaskPatch);
  if (!parsed.success) return integrationError(400, 'invalid_request', parsed.message, auth.traceId);
  return runIdempotentMutation({
    request,
    route: `/api/integrations/v1/tasks/${id.data.id}`,
    input: parsed.data,
    traceId: auth.traceId,
    execute: async () => {
      const row = await patchAutomationTask(id.data.id, parsed.data);
      return row
        ? { status: 200, body: { ok: true, data: row, traceId: auth.traceId } }
        : { status: 404, body: { ok: false, error: { code: 'not_found', message: 'Task not found' }, traceId: auth.traceId } };
    },
  });
}
