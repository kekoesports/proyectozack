import { type NextRequest } from 'next/server';
import { authorizeIntegrationRequest } from '@/lib/integrations/auth';
import { runIdempotentMutation } from '@/lib/integrations/idempotency';
import { firstIssue, parseJsonWithSchema } from '@/lib/integrations/request';
import { integrationError, integrationSuccess } from '@/lib/integrations/responses';
import { createCommunicationDraft, listCommunicationDrafts } from '@/lib/queries/automation/drafts';
import { DraftCreate, DraftListQuery } from '@/lib/schemas/integrationApi';

export async function GET(request: NextRequest) {
  const auth = await authorizeIntegrationRequest(request);
  if (!auth.ok) return auth.response;
  const parsed = DraftListQuery.safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!parsed.success) return integrationError(400, 'invalid_request', firstIssue(parsed.error), auth.traceId);
  return integrationSuccess(await listCommunicationDrafts(parsed.data), auth.traceId);
}

export async function POST(request: NextRequest) {
  const auth = await authorizeIntegrationRequest(request);
  if (!auth.ok) return auth.response;
  const parsed = await parseJsonWithSchema(request, DraftCreate);
  if (!parsed.success) return integrationError(400, 'invalid_request', parsed.message, auth.traceId);
  return runIdempotentMutation({
    request,
    route: '/api/integrations/v1/drafts',
    input: parsed.data,
    traceId: auth.traceId,
    execute: async () => {
      const result = await createCommunicationDraft(parsed.data);
      return {
        status: result.created ? 201 : 200,
        body: { ok: true, data: result.draft, traceId: auth.traceId },
      };
    },
  });
}
