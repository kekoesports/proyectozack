import { NextRequest, NextResponse } from 'next/server';

import {
  createDealTrackingSheetDirect,
  type CreateDealSheetOptions,
} from '@/lib/drive/deal-tracking-sheet';
import { env } from '@/lib/env';
import { timingSafeEqual } from '@/lib/security/timingSafeEqual';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

type RelayBody = {
  brandName?: unknown;
  talentName?: unknown;
  options?: unknown;
};

export async function POST(request: NextRequest): Promise<NextResponse> {
  const relayToken = env.DRIVE_RELAY_AUTH_TOKEN;
  if (!relayToken) {
    return NextResponse.json({ ok: false, reason: 'missing-config', detail: 'Service misconfigured' }, { status: 503 });
  }
  const authorization = request.headers.get('authorization') ?? '';
  if (!timingSafeEqual(authorization, `Bearer ${relayToken}`)) {
    return NextResponse.json({ ok: false, reason: 'no-access', detail: 'Unauthorized' }, { status: 401 });
  }

  const contentLength = Number(request.headers.get('content-length') ?? '0');
  if (contentLength > 256_000) {
    return NextResponse.json({ ok: false, reason: 'drive-error', detail: 'Payload too large' }, { status: 413 });
  }

  let body: RelayBody;
  try {
    body = await request.json() as RelayBody;
  } catch {
    return NextResponse.json({ ok: false, reason: 'drive-error', detail: 'Invalid JSON' }, { status: 400 });
  }
  if (
    typeof body.brandName !== 'string'
    || body.brandName.length < 1
    || body.brandName.length > 200
    || typeof body.talentName !== 'string'
    || body.talentName.length < 1
    || body.talentName.length > 200
    || !body.options
    || typeof body.options !== 'object'
  ) {
    return NextResponse.json({ ok: false, reason: 'drive-error', detail: 'Invalid payload' }, { status: 400 });
  }

  const result = await createDealTrackingSheetDirect(
    body.brandName,
    body.talentName,
    body.options as CreateDealSheetOptions,
  );
  console.info('[drive-relay] completed', { ok: result.ok });
  return NextResponse.json(result, { status: result.ok ? 200 : 502 });
}
