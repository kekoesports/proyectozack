import { type NextRequest } from 'next/server';
import { authorizeIntegrationRequest } from '@/lib/integrations/auth';
import { runIdempotentMutation } from '@/lib/integrations/idempotency';
import { firstIssue, parseJsonWithSchema } from '@/lib/integrations/request';
import { integrationError, integrationSuccess } from '@/lib/integrations/responses';
import {
  getAutomationCampaignContext,
  patchAutomationCampaignAssets,
} from '@/lib/queries/automation/context';
import { CampaignAutomationPatch, NumericIdParam } from '@/lib/schemas/integrationApi';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await authorizeIntegrationRequest(request);
  if (!auth.ok) return auth.response;
  const id = NumericIdParam.safeParse(await context.params);
  if (!id.success) return integrationError(400, 'invalid_request', firstIssue(id.error), auth.traceId);
  const result = await getAutomationCampaignContext(id.data.id);
  if (!result) return integrationError(404, 'not_found', 'Campaign not found', auth.traceId);
  return integrationSuccess(result, auth.traceId);
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await authorizeIntegrationRequest(request);
  if (!auth.ok) return auth.response;
  const id = NumericIdParam.safeParse(await context.params);
  if (!id.success) return integrationError(400, 'invalid_request', firstIssue(id.error), auth.traceId);
  const parsed = await parseJsonWithSchema(request, CampaignAutomationPatch);
  if (!parsed.success) return integrationError(400, 'invalid_request', parsed.message, auth.traceId);
  return runIdempotentMutation({
    request,
    route: `/api/integrations/v1/campaigns/${id.data.id}`,
    input: parsed.data,
    traceId: auth.traceId,
    execute: async () => {
      const row = await patchAutomationCampaignAssets(id.data.id, parsed.data);
      if (!row) {
        return {
          status: 404,
          body: { ok: false, error: { code: 'not_found', message: 'Campaign not found' }, traceId: auth.traceId },
        };
      }
      return { status: 200, body: { ok: true, data: row, traceId: auth.traceId } };
    },
  });
}
