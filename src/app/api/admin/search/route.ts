import { NextResponse, type NextRequest } from 'next/server';

import { requireAnyRole, type Role } from '@/lib/auth-guard';
import { globalSearch } from '@/lib/queries/search';

// Hard cap on the search query length to avoid abusive ILIKE patterns
// (Drizzle parametrises the value, but Postgres still has to evaluate it).
const MAX_QUERY_LENGTH = 100;

export async function GET(request: NextRequest): Promise<NextResponse> {
  const session = await requireAnyRole(['admin', 'manager', 'staff'], '/admin/login');
  const url = new URL(request.url);
  const rawQuery = url.searchParams.get('q') ?? '';
  const query = rawQuery.length > MAX_QUERY_LENGTH ? rawQuery.slice(0, MAX_QUERY_LENGTH) : rawQuery;
  const limitRaw = url.searchParams.get('limit') ?? '5';
  const limit = Math.min(20, Math.max(1, Number.parseInt(limitRaw, 10) || 5));

  const role = (session.user.role ?? 'staff') as Role;
  const results = await globalSearch(query, {
    session: { userId: session.user.id, role },
    limit,
  });

  return NextResponse.json(results, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
