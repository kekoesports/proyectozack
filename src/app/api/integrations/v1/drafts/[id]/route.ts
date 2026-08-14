import { type NextRequest } from 'next/server';
import { authorizeIntegrationRequest } from '@/lib/integrations/auth';
import { runIdempotentMutation } from '@/lib/integrations/idempotency';
import { firstIssue, parseJsonWithSchema } from '@/lib/integrations/request';
import { integrationError } from '@/lib/integrations/responses';
import { recordDraftProviderResult } from '@/lib/queries/automation/drafts';
import { DraftProviderPatch, NumericIdParam } from '@/lib/schemas/integrationApi';

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await authorizeIntegrationRequest(request);
  if (!auth.ok) return auth.response;
  const id = NumericIdParam.safeParse(await context.params);
  if (!id.success) return integrationError(400, 'invalid_request', firstIssue(id.error), auth.traceId);
  const parsed = await parseJsonWithSchema(request, DraftProviderPatch);
  if (!parsed.success) return integrationError(400, 'invalid_request', parsed.message, auth.traceId);
  return runIdempotentMutation({
    request,
    route: `/api/integrations/v1/drafts/${id.data.id}`,
    input: parsed.data,
    traceId: auth.traceId,
    execute: async () => {
      const result = await recordDraftProviderResult(id.data.id, parsed.data);
      if (result.outcome === 'not_found') {
        return { status: 404, body: { ok: false, error: { code: 'not_found', message: 'Draft not found' }, traceId: auth.traceId } };
      }
      if (result.outcome === 'invalid_state') {
        return { status: 409, body: { ok: false, error: { code: 'conflict', message: 'Only approved drafts may be sent' }, traceId: auth.traceId } };
      }
      return { status: 200, body: { ok: true, data: result.draft, traceId: auth.traceId } };
    },
  });
}
