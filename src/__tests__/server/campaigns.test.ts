/**
 * Tests for campaigns queries.
 *
 * DB-dependent tests mock @/lib/db to avoid real connections.
 * computeCampaignDerived tests are pure — no mocks needed.
 */

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
  builder.orderBy.mockResolvedValue(resolvedValue);
  builder.limit.mockResolvedValue(resolvedValue);
  return builder;
};

const mockSelect = jest.fn();
const mockUpdate = jest.fn();
const mockInsert = jest.fn();

const mockDb = {
  select: mockSelect,
  update: mockUpdate,
  insert: mockInsert,
};

jest.mock('@/lib/db', () => ({ db: mockDb }));

// ── Imports after mocks ───────────────────────────────────────────────────────

import {
  listCampaigns,
  getCampaignPaymentStatus,
  assertCanEditCampaign,
} from '@/lib/queries/campaigns';
import { computeCampaignDerived } from '@/lib/schemas/campaign';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const makeCampaignRow = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: 1,
  name: 'Test Campaign',
  brandId: 10,
  talentId: 20,
  brandContactId: null,
  responsibleUserId: null,
  createdByUserId: 'user-creator',
  assignedToUserId: 'user-assigned',
  sector: null,
  geo: null,
  actionType: 'stream' as const,
  status: 'activa' as const,
  startDate: null,
  endDate: null,
  deliveryDeadline: null,
  briefingUrl: null,
  contentUrl: null,
  notes: null,
  amountBrand: '1000.00',
  amountTalent: '700.00',
  brandPaymentMethod: null,
  talentPaymentMethod: null,
  visibility: 'team',
  archivedAt: null,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  ...overrides,
});

// ── computeCampaignDerived — pure function tests ──────────────────────────────

describe('computeCampaignDerived', () => {
  it('computes commissionAmount as brand minus talent', () => {
    const result = computeCampaignDerived({ amountBrand: '1000', amountTalent: '700' });
    expect(result.commissionAmount).toBe(300);
  });

  it('computes commissionPct correctly', () => {
    const result = computeCampaignDerived({ amountBrand: '1000', amountTalent: '700' });
    expect(result.commissionPct).toBeCloseTo(30);
  });

  it('returns 0 commissionPct when amountBrand is 0', () => {
    const result = computeCampaignDerived({ amountBrand: '0', amountTalent: '0' });
    expect(result.commissionPct).toBe(0);
  });

  it('accepts numeric inputs', () => {
    const result = computeCampaignDerived({ amountBrand: 500, amountTalent: 250 });
    expect(result.commissionAmount).toBe(250);
    expect(result.commissionPct).toBe(50);
  });
});

// ── listCampaigns — visibility filter tests ───────────────────────────────────

describe('listCampaigns', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('staff: only returns campaigns where assignedToUserId or createdByUserId matches', async () => {
    const userId = 'staff-user-1';
    const campaign = makeCampaignRow({
      assignedToUserId: userId,
      createdByUserId: 'someone-else',
    });

    mockSelect.mockImplementation(() => makeSelectBuilder([campaign]));

    const result = await listCampaigns({ session: { role: 'staff', userId } });

    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe(1);
    // Verify the where clause was called (visibility filter applied)
    const builder = mockSelect.mock.results[0]?.value as SelectBuilder;
    expect(builder.where).toHaveBeenCalled();
  });

  it('admin: returns all campaigns without visibility filter', async () => {
    const campaigns = [
      makeCampaignRow({ id: 1, assignedToUserId: 'user-a' }),
      makeCampaignRow({ id: 2, assignedToUserId: 'user-b', createdByUserId: 'user-c' }),
    ];

    mockSelect.mockImplementation(() => makeSelectBuilder(campaigns));

    const result = await listCampaigns({ session: { role: 'admin', userId: 'admin-user' } });
    expect(result).toHaveLength(2);
  });

  it('manager: returns all campaigns without visibility filter', async () => {
    const campaigns = [
      makeCampaignRow({ id: 1 }),
      makeCampaignRow({ id: 2 }),
      makeCampaignRow({ id: 3 }),
    ];

    mockSelect.mockImplementation(() => makeSelectBuilder(campaigns));

    const result = await listCampaigns({ session: { role: 'manager', userId: 'mgr-user' } });
    expect(result).toHaveLength(3);
  });

  it('excludes archived campaigns by default (includeArchived not set)', async () => {
    // Only non-archived campaign returned by mock (filter applied in DB layer)
    const nonArchived = makeCampaignRow({ id: 1, archivedAt: null });

    mockSelect.mockImplementation(() => makeSelectBuilder([nonArchived]));

    const result = await listCampaigns({ filters: {} });
    expect(result).toHaveLength(1);
    expect(result[0]?.archivedAt).toBeNull();
    // where was called with isNull condition
    const builder = mockSelect.mock.results[0]?.value as SelectBuilder;
    expect(builder.where).toHaveBeenCalled();
  });

  it('excludes archived campaigns when includeArchived is false', async () => {
    const nonArchived = makeCampaignRow({ id: 1, archivedAt: null });

    mockSelect.mockImplementation(() => makeSelectBuilder([nonArchived]));

    const result = await listCampaigns({ filters: { includeArchived: false } });
    expect(result).toHaveLength(1);
    expect(result[0]?.archivedAt).toBeNull();
  });

  it('includes archived campaigns when includeArchived is true', async () => {
    const archived = makeCampaignRow({ id: 2, archivedAt: new Date('2024-06-01') });
    const nonArchived = makeCampaignRow({ id: 1, archivedAt: null });

    mockSelect.mockImplementation(() => makeSelectBuilder([nonArchived, archived]));

    const result = await listCampaigns({ filters: { includeArchived: true } });
    expect(result).toHaveLength(2);
  });

  it('filters by status when provided', async () => {
    const campaign = makeCampaignRow({ status: 'activa' });

    mockSelect.mockImplementation(() => makeSelectBuilder([campaign]));

    const result = await listCampaigns({ filters: { status: 'activa' } });
    expect(result).toHaveLength(1);
    expect(result[0]?.status).toBe('activa');
  });

  it('filters by brandId when provided', async () => {
    const campaign = makeCampaignRow({ brandId: 42 });

    mockSelect.mockImplementation(() => makeSelectBuilder([campaign]));

    const result = await listCampaigns({ filters: { brandId: 42 } });
    expect(result).toHaveLength(1);
    expect(result[0]?.brandId).toBe(42);
  });

  it('returns empty array when no campaigns match', async () => {
    mockSelect.mockImplementation(() => makeSelectBuilder([]));

    const result = await listCampaigns({ session: { role: 'staff', userId: 'nobody' } });
    expect(result).toHaveLength(0);
  });
});

// ── getCampaignPaymentStatus — derived from invoices ─────────────────────────

describe('getCampaignPaymentStatus', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('brandPaid=si when income cobrada sum >= amountBrand', async () => {
    let callCount = 0;
    mockSelect.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // income cobrada sum = 1000
        return makeSelectBuilder([{ total: '1000.00' }]);
      }
      // expense cobrada sum = 0
      return makeSelectBuilder([{ total: '0.00' }]);
    });

    const result = await getCampaignPaymentStatus(1, 1000, 700);

    expect(result.brandPaid).toBe('si');
    expect(result.totalInvoicedBrand).toBe(1000);
  });

  it('brandPaid=parcial when income cobrada sum > 0 and < amountBrand', async () => {
    let callCount = 0;
    mockSelect.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return makeSelectBuilder([{ total: '500.00' }]);
      }
      return makeSelectBuilder([{ total: '0.00' }]);
    });

    const result = await getCampaignPaymentStatus(1, 1000, 700);

    expect(result.brandPaid).toBe('parcial');
    expect(result.totalInvoicedBrand).toBe(500);
  });

  it('brandPaid=no when income cobrada sum = 0', async () => {
    let callCount = 0;
    mockSelect.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return makeSelectBuilder([{ total: '0.00' }]);
      }
      return makeSelectBuilder([{ total: '0.00' }]);
    });

    const result = await getCampaignPaymentStatus(1, 1000, 700);

    expect(result.brandPaid).toBe('no');
    expect(result.totalInvoicedBrand).toBe(0);
  });

  it('talentPaid=si when expense cobrada sum >= amountTalent', async () => {
    let callCount = 0;
    mockSelect.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // income
        return makeSelectBuilder([{ total: '0.00' }]);
      }
      // expense cobrada sum = 700
      return makeSelectBuilder([{ total: '700.00' }]);
    });

    const result = await getCampaignPaymentStatus(1, 1000, 700);

    expect(result.talentPaid).toBe('si');
    expect(result.totalPaidTalent).toBe(700);
  });

  it('talentPaid=parcial when expense cobrada sum > 0 and < amountTalent', async () => {
    let callCount = 0;
    mockSelect.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return makeSelectBuilder([{ total: '0.00' }]);
      }
      return makeSelectBuilder([{ total: '350.00' }]);
    });

    const result = await getCampaignPaymentStatus(1, 1000, 700);

    expect(result.talentPaid).toBe('parcial');
    expect(result.totalPaidTalent).toBe(350);
  });

  it('talentPaid=no when expense cobrada sum = 0', async () => {
    let callCount = 0;
    mockSelect.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return makeSelectBuilder([{ total: '0.00' }]);
      }
      return makeSelectBuilder([{ total: '0.00' }]);
    });

    const result = await getCampaignPaymentStatus(1, 1000, 700);

    expect(result.talentPaid).toBe('no');
    expect(result.totalPaidTalent).toBe(0);
  });

  it('handles null/missing total gracefully (COALESCE returns 0)', async () => {
    mockSelect.mockImplementation(() => makeSelectBuilder([{ total: '0' }]));

    const result = await getCampaignPaymentStatus(1, 1000, 700);

    expect(result.brandPaid).toBe('no');
    expect(result.talentPaid).toBe('no');
    expect(result.totalInvoicedBrand).toBe(0);
    expect(result.totalPaidTalent).toBe(0);
  });

  it('brandPaid=si when income exactly equals amountBrand (boundary)', async () => {
    let callCount = 0;
    mockSelect.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return makeSelectBuilder([{ total: '500.00' }]);
      }
      return makeSelectBuilder([{ total: '0.00' }]);
    });

    const result = await getCampaignPaymentStatus(1, 500, 300);

    expect(result.brandPaid).toBe('si');
  });
});

// ── assertCanEditCampaign — permission tests ──────────────────────────────────

describe('assertCanEditCampaign', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('admin: does not throw regardless of campaign ownership', async () => {
    // No DB call needed for admin
    await expect(
      assertCanEditCampaign(1, { userId: 'admin-user', role: 'admin' }),
    ).resolves.toBeUndefined();
    expect(mockSelect).not.toHaveBeenCalled();
  });

  it('manager: does not throw regardless of campaign ownership', async () => {
    await expect(
      assertCanEditCampaign(1, { userId: 'mgr-user', role: 'manager' }),
    ).resolves.toBeUndefined();
    expect(mockSelect).not.toHaveBeenCalled();
  });

  it('staff: does not throw when assignedToUserId matches', async () => {
    const userId = 'staff-user';
    mockSelect.mockImplementation(() =>
      makeSelectBuilder([{ assignedToUserId: userId, createdByUserId: 'other' }]),
    );

    await expect(
      assertCanEditCampaign(1, { userId, role: 'staff' }),
    ).resolves.toBeUndefined();
  });

  it('staff: does not throw when createdByUserId matches', async () => {
    const userId = 'staff-creator';
    mockSelect.mockImplementation(() =>
      makeSelectBuilder([{ assignedToUserId: null, createdByUserId: userId }]),
    );

    await expect(
      assertCanEditCampaign(1, { userId, role: 'staff' }),
    ).resolves.toBeUndefined();
  });

  it('staff: throws forbidden:edit:campaign when campaign belongs to another user', async () => {
    const userId = 'staff-user';
    mockSelect.mockImplementation(() =>
      makeSelectBuilder([{ assignedToUserId: 'other-user', createdByUserId: 'another-user' }]),
    );

    await expect(
      assertCanEditCampaign(1, { userId, role: 'staff' }),
    ).rejects.toThrow('forbidden:edit:campaign');
  });

  it('staff: throws forbidden:edit:campaign when campaign not found', async () => {
    mockSelect.mockImplementation(() => makeSelectBuilder([]));

    await expect(
      assertCanEditCampaign(999, { userId: 'staff-user', role: 'staff' }),
    ).rejects.toThrow('forbidden:edit:campaign');
  });

  it('staff: throws forbidden:edit:campaign when both assignedTo and createdBy are null', async () => {
    const userId = 'staff-user';
    mockSelect.mockImplementation(() =>
      makeSelectBuilder([{ assignedToUserId: null, createdByUserId: null }]),
    );

    await expect(
      assertCanEditCampaign(1, { userId, role: 'staff' }),
    ).rejects.toThrow('forbidden:edit:campaign');
  });
});
