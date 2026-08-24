import { NextResponse } from 'next/server';

import { ingestAgentEvent } from '@/lib/queries/agents/events';
import { SearchConsoleAutomationSnapshot } from '@/lib/schemas/searchConsoleAutomation';
import { verifyAutomationToken } from '@/lib/security/assertAutomationAuth';

export const dynamic = 'force-dynamic';

export async function POST(request: Request): Promise<NextResponse> {
  const auth = verifyAutomationToken(request);
  if (!auth.ok) {
    return NextResponse.json(
      { ok: false, error: auth.reason },
      { status: auth.reason === 'missing-config' ? 503 : 401 },
    );
  }

  const body: unknown = await request.json().catch(() => null);
  const parsed = SearchConsoleAutomationSnapshot.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: 'invalid-body', issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const snapshot = parsed.data;
  const externalId = snapshot.snapshotId ?? `daily:${snapshot.period.endDate}`;
  const result = await ingestAgentEvent({
    source: 'google-search-console',
    eventType: 'seo.search_console_snapshot',
    externalId,
    severity: 'info',
    payloadJson: snapshot,
    fingerprint: `search-console:${snapshot.period.endDate}`,
    occurredAt: new Date(snapshot.collectedAt),
  });

  return NextResponse.json({
    ok: true,
    eventId: result.event.id,
    deduplicated: result.deduplicated,
  });
}
