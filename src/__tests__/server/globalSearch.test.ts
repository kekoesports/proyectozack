jest.mock('@/lib/env', () => ({
  env: {
    DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
    RESEND_API_KEY: 're_test_000',
    BETTER_AUTH_SECRET: 'test-secret-32-chars-minimum-padding-xx',
    NEXT_PUBLIC_SITE_URL: 'http://localhost:3000',
  },
}));
jest.mock('@/lib/auth', () => ({ auth: {} }));

// ── DB mock ───────────────────────────────────────────────────────────────────

type SelectBuilder = {
  from: jest.Mock;
  leftJoin: jest.Mock;
  innerJoin: jest.Mock;
  where: jest.Mock;
  orderBy: jest.Mock;
  limit: jest.Mock;
  then: jest.Mock;
};

const makeSelectBuilder = (resolvedValue: unknown[]): SelectBuilder => {
  const resolved = Promise.resolve(resolvedValue);
  const builder: SelectBuilder = {
    from: jest.fn(),
    leftJoin: jest.fn(),
    innerJoin: jest.fn(),
    where: jest.fn(),
    orderBy: jest.fn(),
    limit: jest.fn(),
    then: jest.fn((onFulfilled: (v: unknown[]) => unknown) => resolved.then(onFulfilled)),
  };
  builder.from.mockReturnValue(builder);
  builder.leftJoin.mockReturnValue(builder);
  builder.innerJoin.mockReturnValue(builder);
  builder.where.mockReturnValue(builder);
  builder.orderBy.mockReturnValue(builder);
  builder.limit.mockResolvedValue(resolvedValue);
  return builder;
};

const mockSelect = jest.fn();
jest.mock('@/lib/db', () => ({ db: { select: mockSelect } }));

import { globalSearch } from '@/lib/queries/search';

// Each call to globalSearch fires 6 parallel selects (brands, talents, campaigns, invoices, tasks, contacts).
// We return empty arrays for all 6 by default.
function setAllEmpty(): void {
  mockSelect.mockReturnValue(makeSelectBuilder([]));
}

function setFirstGroupResult(rows: unknown[]): void {
  let callCount = 0;
  mockSelect.mockImplementation(() => {
    callCount += 1;
    return makeSelectBuilder(callCount === 1 ? rows : []);
  });
}

beforeEach(() => {
  mockSelect.mockReset();
  setAllEmpty();
});

describe('globalSearch', () => {
  it('returns empty groups for query shorter than 2 chars', async () => {
    const result = await globalSearch('a', { session: { userId: 'u1', role: 'admin' } });
    expect(result.groups.brands).toHaveLength(0);
    expect(result.groups.talents).toHaveLength(0);
    expect(result.groups.campaigns).toHaveLength(0);
    expect(result.groups.invoices).toHaveLength(0);
    expect(result.groups.tasks).toHaveLength(0);
    expect(result.groups.contacts).toHaveLength(0);
    // DB should NOT be called for short queries
    expect(mockSelect).not.toHaveBeenCalled();
  });

  it('returns empty groups for empty string', async () => {
    const result = await globalSearch('', { session: { userId: 'u1', role: 'admin' } });
    expect(result.groups.brands).toHaveLength(0);
    expect(mockSelect).not.toHaveBeenCalled();
  });

  it('calls DB for query >= 2 chars and returns shaped hits', async () => {
    setFirstGroupResult([
      { id: 1, name: 'Skin Club', status: 'activa', sector: 'casino', createdByUserId: null, assignedToUserId: null },
    ]);

    const result = await globalSearch('skin', { session: { userId: 'u1', role: 'admin' } });

    expect(mockSelect).toHaveBeenCalled();
    expect(result.query).toBe('skin');
    expect(result.groups.brands).toHaveLength(1);
    expect(result.groups.brands[0]?.title).toBe('Skin Club');
    expect(result.groups.brands[0]?.href).toContain('/admin/brands');
    expect(typeof result.tookMs).toBe('number');
  });

  it('returns all groups as empty arrays when DB returns nothing', async () => {
    const result = await globalSearch('xyz', { session: { userId: 'u1', role: 'admin' } });
    for (const group of Object.values(result.groups)) {
      expect(group).toHaveLength(0);
    }
  });

  it('respects limit parameter', async () => {
    const rows = Array.from({ length: 10 }, (_, i) => ({
      id: i + 1,
      name: `Brand ${i + 1}`,
      status: 'activa',
      sector: null,
      createdByUserId: null,
      assignedToUserId: null,
    }));
    // The limit is passed to the DB query; mock returns all rows but the real DB would cap them.
    // Here we just verify the function accepts the limit param without error.
    setFirstGroupResult(rows.slice(0, 3));
    const result = await globalSearch('brand', { session: { userId: 'u1', role: 'admin' }, limit: 3 });
    expect(result.groups.brands.length).toBeLessThanOrEqual(3);
  });

  it('staff role: query still executes (visibility filter applied at SQL level)', async () => {
    setFirstGroupResult([]);
    const result = await globalSearch('test', { session: { userId: 'staff-1', role: 'staff' } });
    // DB is called (visibility filter is a SQL WHERE clause, not a JS filter)
    expect(mockSelect).toHaveBeenCalled();
    expect(result.groups.brands).toHaveLength(0);
  });

  it('includes tookMs in result', async () => {
    const result = await globalSearch('hello', { session: { userId: 'u1', role: 'admin' } });
    expect(result.tookMs).toBeGreaterThanOrEqual(0);
  });
});
