/**
 * Tests for brand-related query functions.
 *
 * Covers:
 *   - getBrandCampaigns    (db.query.brandCampaigns.findMany)
 *   - getBrandProposals    (db.query.talentProposals.findMany)
 *   - getTalentCampaignsForBrand (db.query.brandCampaigns.findMany with compound where)
 *   - getAllBrandUsers      (db.select().from().where().orderBy())
 */

// ── Mock env / auth before any imports ───────────────────────────────────────
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
  where: jest.Mock;
  orderBy: jest.Mock;
};

const makeSelectBuilder = (resolvedValue: unknown[]): SelectBuilder => {
  const builder: SelectBuilder = {
    from: jest.fn(),
    where: jest.fn(),
    orderBy: jest.fn(),
  };
  builder.from.mockReturnValue(builder);
  builder.where.mockReturnValue(builder);
  builder.orderBy.mockResolvedValue(resolvedValue);
  return builder;
};

const mockFindManyBrandCampaigns = jest.fn();
const mockFindManyTalentProposals = jest.fn();
const mockSelect = jest.fn();

const mockDb = {
  query: {
    brandCampaigns: {
      findMany: mockFindManyBrandCampaigns,
    },
    talentProposals: {
      findMany: mockFindManyTalentProposals,
    },
  },
  select: mockSelect,
};

jest.mock('@/lib/db', () => ({ db: mockDb }));

// ── Imports after mocks ───────────────────────────────────────────────────────

import { getBrandCampaigns, getBrandProposals, getTalentCampaignsForBrand } from '@/lib/queries/brands';
import { getAllBrandUsers } from '@/lib/queries/brandUsers';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const makeBrandCampaign = (overrides: Record<string, unknown> = {}) => ({
  id: 1,
  brandUserId: 'brand-user-1',
  talentId: 10,
  caseStudyId: null,
  status: 'activa',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  talent: { id: 10, name: 'Talent One' },
  caseStudy: null,
  ...overrides,
});

const makeTalentProposal = (overrides: Record<string, unknown> = {}) => ({
  id: 1,
  brandUserId: 'brand-user-1',
  talentId: 10,
  message: 'Proposal message',
  status: 'pending',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  talent: { id: 10, name: 'Talent One' },
  ...overrides,
});

const makeBrandUserRow = (overrides: Record<string, unknown> = {}) => ({
  id: 'user-1',
  name: 'Brand User',
  email: 'brand@example.com',
  ...overrides,
});

// ── getBrandCampaigns ─────────────────────────────────────────────────────────

describe('brand queries', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getBrandCampaigns', () => {
    it('returns campaigns array from mock DB', async () => {
      const campaigns = [
        makeBrandCampaign({ id: 1, brandUserId: 'brand-user-1' }),
        makeBrandCampaign({ id: 2, brandUserId: 'brand-user-1' }),
      ];
      mockFindManyBrandCampaigns.mockResolvedValue(campaigns);

      const result = await getBrandCampaigns('brand-user-1');

      expect(result).toHaveLength(2);
      expect(result[0]?.id).toBe(1);
      expect(result[1]?.id).toBe(2);
    });

    it('returns empty array when no campaigns exist for the brand user', async () => {
      mockFindManyBrandCampaigns.mockResolvedValue([]);

      const result = await getBrandCampaigns('brand-user-no-campaigns');

      expect(result).toEqual([]);
    });

    it('calls db.query.brandCampaigns.findMany', async () => {
      mockFindManyBrandCampaigns.mockResolvedValue([]);

      await getBrandCampaigns('brand-user-1');

      expect(mockFindManyBrandCampaigns).toHaveBeenCalledTimes(1);
    });

    it('passes brandUserId as the where filter', async () => {
      mockFindManyBrandCampaigns.mockResolvedValue([]);

      await getBrandCampaigns('brand-user-abc');

      const callArg = mockFindManyBrandCampaigns.mock.calls[0]?.[0] as Record<string, unknown>;
      expect(callArg).toBeDefined();
      expect(callArg).toHaveProperty('where');
      expect(callArg).toHaveProperty('with');
      expect(callArg).toHaveProperty('orderBy');
    });

    it('includes talent and caseStudy relations in the result', async () => {
      const campaign = makeBrandCampaign({
        talent: { id: 10, name: 'Talent One' },
        caseStudy: { id: 5, title: 'Case Study' },
      });
      mockFindManyBrandCampaigns.mockResolvedValue([campaign]);

      const result = await getBrandCampaigns('brand-user-1');

      expect(result[0]?.talent).toEqual({ id: 10, name: 'Talent One' });
      expect(result[0]?.caseStudy).toEqual({ id: 5, title: 'Case Study' });
    });
  });

  // ── getBrandProposals ───────────────────────────────────────────────────────

  describe('getBrandProposals', () => {
    it('returns proposals array from mock DB', async () => {
      const proposals = [
        makeTalentProposal({ id: 1, brandUserId: 'brand-user-1' }),
        makeTalentProposal({ id: 2, brandUserId: 'brand-user-1' }),
      ];
      mockFindManyTalentProposals.mockResolvedValue(proposals);

      const result = await getBrandProposals('brand-user-1');

      expect(result).toHaveLength(2);
      expect(result[0]?.id).toBe(1);
      expect(result[1]?.id).toBe(2);
    });

    it('returns empty array when no proposals exist', async () => {
      mockFindManyTalentProposals.mockResolvedValue([]);

      const result = await getBrandProposals('brand-user-no-proposals');

      expect(result).toEqual([]);
    });

    it('calls db.query.talentProposals.findMany', async () => {
      mockFindManyTalentProposals.mockResolvedValue([]);

      await getBrandProposals('brand-user-1');

      expect(mockFindManyTalentProposals).toHaveBeenCalledTimes(1);
    });

    it('passes brandUserId as the where filter', async () => {
      mockFindManyTalentProposals.mockResolvedValue([]);

      await getBrandProposals('brand-user-xyz');

      const callArg = mockFindManyTalentProposals.mock.calls[0]?.[0] as Record<string, unknown>;
      expect(callArg).toBeDefined();
      expect(callArg).toHaveProperty('where');
      expect(callArg).toHaveProperty('with');
      expect(callArg).toHaveProperty('orderBy');
    });

    it('includes talent relation in the result', async () => {
      const proposal = makeTalentProposal({
        talent: { id: 10, name: 'Talent One' },
      });
      mockFindManyTalentProposals.mockResolvedValue([proposal]);

      const result = await getBrandProposals('brand-user-1');

      expect(result[0]?.talent).toEqual({ id: 10, name: 'Talent One' });
    });
  });

  // ── getTalentCampaignsForBrand ──────────────────────────────────────────────

  describe('getTalentCampaignsForBrand', () => {
    it('returns campaigns filtered by both brandUserId and talentId', async () => {
      const campaigns = [
        makeBrandCampaign({ id: 3, brandUserId: 'brand-user-1', talentId: 42 }),
      ];
      mockFindManyBrandCampaigns.mockResolvedValue(campaigns);

      const result = await getTalentCampaignsForBrand('brand-user-1', 42);

      expect(result).toHaveLength(1);
      expect(result[0]?.id).toBe(3);
      expect(result[0]?.talentId).toBe(42);
    });

    it('returns empty array when no matching campaigns exist', async () => {
      mockFindManyBrandCampaigns.mockResolvedValue([]);

      const result = await getTalentCampaignsForBrand('brand-user-1', 999);

      expect(result).toEqual([]);
    });

    it('calls db.query.brandCampaigns.findMany with compound where', async () => {
      mockFindManyBrandCampaigns.mockResolvedValue([]);

      await getTalentCampaignsForBrand('brand-user-1', 42);

      expect(mockFindManyBrandCampaigns).toHaveBeenCalledTimes(1);
      const callArg = mockFindManyBrandCampaigns.mock.calls[0]?.[0] as Record<string, unknown>;
      expect(callArg).toHaveProperty('where');
      expect(callArg).toHaveProperty('with');
      expect(callArg).toHaveProperty('orderBy');
    });

    it('returns multiple campaigns when several match both filters', async () => {
      const campaigns = [
        makeBrandCampaign({ id: 1, brandUserId: 'brand-user-1', talentId: 7 }),
        makeBrandCampaign({ id: 2, brandUserId: 'brand-user-1', talentId: 7 }),
        makeBrandCampaign({ id: 3, brandUserId: 'brand-user-1', talentId: 7 }),
      ];
      mockFindManyBrandCampaigns.mockResolvedValue(campaigns);

      const result = await getTalentCampaignsForBrand('brand-user-1', 7);

      expect(result).toHaveLength(3);
    });

    it('includes talent and caseStudy relations in the result', async () => {
      const campaign = makeBrandCampaign({
        talent: { id: 7, name: 'Talent Seven' },
        caseStudy: null,
      });
      mockFindManyBrandCampaigns.mockResolvedValue([campaign]);

      const result = await getTalentCampaignsForBrand('brand-user-1', 7);

      expect(result[0]?.talent).toEqual({ id: 7, name: 'Talent Seven' });
      expect(result[0]?.caseStudy).toBeNull();
    });
  });

  // ── getAllBrandUsers ─────────────────────────────────────────────────────────

  describe('getAllBrandUsers', () => {
    it('returns array of { id, name, email } objects', async () => {
      const users = [
        makeBrandUserRow({ id: 'u1', name: 'Alice', email: 'alice@brand.com' }),
        makeBrandUserRow({ id: 'u2', name: 'Bob', email: 'bob@brand.com' }),
      ];
      mockSelect.mockImplementation(() => makeSelectBuilder(users));

      const result = await getAllBrandUsers();

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ id: 'u1', name: 'Alice', email: 'alice@brand.com' });
      expect(result[1]).toEqual({ id: 'u2', name: 'Bob', email: 'bob@brand.com' });
    });

    it('returns empty array when no brand users exist', async () => {
      mockSelect.mockImplementation(() => makeSelectBuilder([]));

      const result = await getAllBrandUsers();

      expect(result).toEqual([]);
    });

    it('calls db.select', async () => {
      mockSelect.mockImplementation(() => makeSelectBuilder([]));

      await getAllBrandUsers();

      expect(mockSelect).toHaveBeenCalledTimes(1);
    });

    it('chains from().where().orderBy() on the select builder', async () => {
      const builder = makeSelectBuilder([]);
      mockSelect.mockReturnValue(builder);

      await getAllBrandUsers();

      expect(builder.from).toHaveBeenCalledTimes(1);
      expect(builder.where).toHaveBeenCalledTimes(1);
      expect(builder.orderBy).toHaveBeenCalledTimes(1);
    });

    it('returns correct shape for a single brand user', async () => {
      const user = makeBrandUserRow({ id: 'u-single', name: 'Solo Brand', email: 'solo@brand.com' });
      mockSelect.mockImplementation(() => makeSelectBuilder([user]));

      const result = await getAllBrandUsers();

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({ id: 'u-single', name: 'Solo Brand', email: 'solo@brand.com' });
    });
  });
});
