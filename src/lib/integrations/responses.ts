import { NextResponse } from 'next/server';

export type IntegrationErrorCode =
  | 'integration_not_configured'
  | 'unauthorized'
  | 'rate_limited'
  | 'invalid_request'
  | 'idempotency_required'
  | 'idempotency_conflict'
  | 'not_found'
  | 'conflict'
  | 'internal_error';

export function integrationError(
  status: number,
  code: IntegrationErrorCode,
  message: string,
  traceId: string,
): NextResponse {
  return NextResponse.json({ ok: false, error: { code, message }, traceId }, { status });
}

export function integrationSuccess(
  data: unknown,
  traceId: string,
  status = 200,
): NextResponse {
  return NextResponse.json({ ok: true, data, traceId }, { status });
}
