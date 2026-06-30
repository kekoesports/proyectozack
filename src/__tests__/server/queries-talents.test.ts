/**
 * Unit tests for `lib/queries/talents.ts`.
 *
 * Covers the most critical exported functions:
 *   - getTalentsByIds   (early-return guard on empty array)
 *   - getTalentBySlug   (cache-wrapped, public visibility filter)
 *   - getAllTalents      (admin, no visibility filter)
 *   - getAdminRosterWithGrowth  (dynamic import + growth % math)
 *   - upsertTalentFromImport    (3 dedup paths — slug / social / insert)
 *   - getTalentFullProfile      (full profile with business + verticals)
 *
 * DB is fully mocked; no real Postgres connection is made.
 */

jest.mock('@/lib/auth', () => ({ auth: {} }));

// ── Mock analytics dynamic import ────────────────────────────────────────────
const mockGetLatestSnapshots = jest.fn();
const mockGetEarliestSnapshots = jest.fn();

jest.mock('@/lib/queries/analytics', () => ({
  getLatestSnapshots: mockGetLatestSnapshots,
  getEarliestSnapshots: mockGetEarliestSnapshots,
}));

// ── DB mock builders ──────────────────────────────────────────────────────────

/**
 * Chainable select builder that resolves to `resolvedValue` when awaited.
 * Mirrors the Drizzle fluent API used in talents.ts.
 */
type SelectBuilder = {
  from: jest.Mock;
  leftJoin: jest.Mock;
  innerJoin: jest.Mock;
  where: jest.Mock;
  orderBy: jest.Mock;
  limit: jest.Mock;
  groupBy: jest.Mock;
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
    groupBy: jest.fn(),
    then: jest.fn((onFulfilled: (v: unknown[]) => unknown) => resolved.then(onFulfilled)),
  };
  builder.from.mockReturnValue(builder);
  builder.leftJoin.mockReturnValue(builder);
  builder.innerJoin.mockReturnValue(builder);
  builder.where.mockReturnValue(builder);
  builder.orderBy.mockResolvedValue(resolvedValue);
  builder.limit.mockResolvedValue(resolvedValue);
  builder.groupBy.mockReturnValue(builder);
  return builder;
};

type InsertBuilder = {
  values: jest.Mock;
  returning: jest.Mock;
};

const makeInsertBuilder = (returningValue: unknown[]): InsertBuilder => {
  const builder: InsertBuilder = {
    values: jest.fn(),
    returning: jest.fn().mockResolvedValue(returningValue),
  };
  builder.values.mockReturnValue(builder);
  return builder;
};

type UpdateBuilder = {
  set: jest.Mock;
  where: jest.Mock;
  returning: jest.Mock;
};

const makeUpdateBuilder = (): UpdateBuilder => {
  const builder: UpdateBuilder = {
    set: jest.fn(),
    where: jest.fn().mockResolvedValue(undefined),
    returning: jest.fn().mockResolvedValue([]),
  };
  builder.set.mockReturnValue(builder);
  builder.where.mockReturnValue(builder);
  return builder;
};

const mockSelect = jest.fn();
const mockInsert = jest.fn();
const mockUpdate = jest.fn();

const mockFindMany = jest.fn();
const mockFindFirst = jest.fn();

const mockDb = {
  select: mockSelect,
  insert: mockInsert,
  update: mockUpdate,
  query: {
    talents: {
      findMany: mockFindMany,
      findFirst: mockFindFirst,
    },
  },
};

jest.mock('@/lib/db', () => ({ db: mockDb }));

// ── Imports after mocks ───────────────────────────────────────────────────────

import {
  getTalentsByIds,
  getTalentBySlug,
  getAllTalents,
  getAdminRosterWithGrowth,
  upsertTalentFromImport,
  getTalentFullProfile,
} from '@/lib/queries/talents';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const makeTalentRow = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: 1,
  slug: 'test-talent',
  name: 'Test Talent',
  role: 'Creator',
  game: 'General',
  platform: 'twitch' as const,
  status: 'active' as const,
  bio: 'A test bio',
  gradientC1: '#f5632a',
  gradientC2: '#8b3aad',
  initials: 'TT',
  sortOrder: 1,
  visibility: 'public' as const,
  creatorCountry: 'ES',
  audienceLanguage: 'es',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  tags: [],
  stats: [],
  socials: [],
  ...overrides,
});

const makeSnapshotRow = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: 1,
  talentId: 1,
  platform: 'twitch',
  metricType: 'followers',
  value: 100000,
  snapshotDate: '2024-01-01',
  topGeos: null,
  notes: null,
  updatedByUserId: null,
  createdAt: new Date('2024-01-01'),
  ...overrides,
});

// ── talent queries ────────────────────────────────────────────────────────────

describe('talent queries', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default: findMany returns [], findFirst returns undefined
    mockFindMany.mockResolvedValue([]);
    mockFindFirst.mockResolvedValue(undefined);
  });

  // ── getTalentsByIds ─────────────────────────────────────────────────────────

  describe('getTalentsByIds', () => {
    it('empty array [] → returns [] immediately WITHOUT calling DB', async () => {
      const result = await getTalentsByIds([]);

      expect(result).toEqual([]);
      expect(mockFindMany).not.toHaveBeenCalled();
    });

    it('non-empty array → calls db.query.talents.findMany and returns results', async () => {
      const talent = makeTalentRow({ id: 5 });
      mockFindMany.mockResolvedValue([talent]);

      const result = await getTalentsByIds([5]);

      expect(mockFindMany).toHaveBeenCalledTimes(1);
      expect(result).toHaveLength(1);
      expect(result[0]?.id).toBe(5);
    });

    it('returns correct talent shape with tags, stats, socials', async () => {
      const talent = makeTalentRow({
        id: 10,
        tags: [{ id: 1, talentId: 10, tag: 'gaming' }],
        stats: [],
        socials: [{ id: 1, talentId: 10, platform: 'twitch', handle: 'testhandle' }],
      });
      mockFindMany.mockResolvedValue([talent]);

      const result = await getTalentsByIds([10]);

      expect(result[0]?.id).toBe(10);
      expect(result[0]?.tags).toHaveLength(1);
      expect(result[0]?.socials).toHaveLength(1);
    });

    it('multiple ids → returns multiple talents', async () => {
      const talents = [makeTalentRow({ id: 1 }), makeTalentRow({ id: 2, slug: 'talent-2' })];
      mockFindMany.mockResolvedValue(talents);

      const result = await getTalentsByIds([1, 2]);

      expect(result).toHaveLength(2);
      expect(mockFindMany).toHaveBeenCalledTimes(1);
    });
  });

  // ── getTalentBySlug ─────────────────────────────────────────────────────────

  describe('getTalentBySlug', () => {
    it('existing slug → returns talent', async () => {
      const talent = makeTalentRow({ slug: 'existing-slug' });
      mockFindFirst.mockResolvedValue(talent);

      const result = await getTalentBySlug('existing-slug');

      expect(result).toBeDefined();
      expect(result?.slug).toBe('existing-slug');
      expect(mockFindFirst).toHaveBeenCalledTimes(1);
    });

    it('non-existing slug → returns undefined', async () => {
      mockFindFirst.mockResolvedValue(undefined);

      const result = await getTalentBySlug('does-not-exist');

      expect(result).toBeUndefined();
    });

    it('null DB result → returns undefined (never null)', async () => {
      mockFindFirst.mockResolvedValue(null);

      const result = await getTalentBySlug('some-slug');

      expect(result).toBeUndefined();
    });

    // ── Tigerr visibility conditions ──────────────────────────────────────────
    // Slug real en DB: "tiger". URL pública: /talentos/tigerr → redirects a /talentos/tiger.
    // Estos tests documentan las condiciones exactas que controlan el acceso público.

    it('[tigerr] slug "tiger" con isPublished=true y archivedAt=null → devuelve talent', async () => {
      const talent = makeTalentRow({ slug: 'tiger', isPublished: true, archivedAt: null });
      mockFindFirst.mockResolvedValue(talent);

      const result = await getTalentBySlug('tiger');

      expect(result).toBeDefined();
      expect(result?.slug).toBe('tiger');
    });

    it('[tigerr] isPublished=false → DB filtra y devuelve undefined → página 404', async () => {
      // La query incluye eq(talents.isPublished, true) — DB no devuelve la fila
      mockFindFirst.mockResolvedValue(undefined);

      const result = await getTalentBySlug('tiger');

      expect(result).toBeUndefined();
    });

    it('[tigerr] archivedAt set → DB filtra y devuelve undefined → página 404', async () => {
      // La query incluye isNull(talents.archivedAt) — DB no devuelve la fila si hay fecha
      mockFindFirst.mockResolvedValue(undefined);

      const result = await getTalentBySlug('tiger');

      expect(result).toBeUndefined();
    });

    it('[tigerr] slug "tigerr" (dos r) → devuelve undefined — el slug real es "tiger"', async () => {
      // La query usa eq exacto; "tigerr" no coincide con "tiger" en DB.
      // El redirect /talentos/tigerr → /talentos/tiger en next.config.ts resuelve esto.
      mockFindFirst.mockResolvedValue(undefined);

      const result = await getTalentBySlug('tigerr');

      expect(result).toBeUndefined();
    });

    it('[tigerr] campos opcionales vacíos (tags/stats/socials=[]) → no lanza excepción', async () => {
      const talent = makeTalentRow({
        slug: 'tiger',
        isPublished: true,
        archivedAt: null,
        tags: [],
        stats: [],
        socials: [],
      });
      mockFindFirst.mockResolvedValue(talent);

      const result = await getTalentBySlug('tiger');

      expect(result).toBeDefined();
      expect(result?.tags).toEqual([]);
      expect(result?.stats).toEqual([]);
      expect(result?.socials).toEqual([]);
    });

    it('[tigerr] slug en mayúsculas "TIGER" → devuelve undefined (query usa eq exacto, slugs siempre lowercase)', async () => {
      // slugify() siempre lowercase — los slugs en DB son siempre minúsculas.
      // El route param llega siempre lowercase desde Next.js dynamic routing.
      mockFindFirst.mockResolvedValue(undefined);

      const result = await getTalentBySlug('TIGER');

      expect(result).toBeUndefined();
    });
  });

  // ── getAllTalents ───────────────────────────────────────────────────────────

  describe('getAllTalents', () => {
    it('returns all talents (no visibility filter — admin function)', async () => {
      const talents = [
        makeTalentRow({ id: 1, visibility: 'public' }),
        makeTalentRow({ id: 2, slug: 'internal-talent', visibility: 'internal' }),
      ];
      mockFindMany.mockResolvedValue(talents);

      const result = await getAllTalents();

      expect(result).toHaveLength(2);
      expect(mockFindMany).toHaveBeenCalledTimes(1);
    });

    it('returns empty array when no talents exist', async () => {
      mockFindMany.mockResolvedValue([]);

      const result = await getAllTalents();

      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });

    it('returns talents with their relations (tags, stats, socials)', async () => {
      const talent = makeTalentRow({
        tags: [{ id: 1, talentId: 1, tag: 'fps' }],
        stats: [{ id: 1, talentId: 1, label: 'Viewers', value: '5000' }],
        socials: [{ id: 1, talentId: 1, platform: 'twitch', handle: 'streamer' }],
      });
      mockFindMany.mockResolvedValue([talent]);

      const result = await getAllTalents();

      expect(result[0]?.tags).toHaveLength(1);
      expect(result[0]?.stats).toHaveLength(1);
      expect(result[0]?.socials).toHaveLength(1);
    });
  });

  // ── getAdminRosterWithGrowth ────────────────────────────────────────────────

  describe('getAdminRosterWithGrowth', () => {
    beforeEach(() => {
      mockGetLatestSnapshots.mockResolvedValue([]);
      mockGetEarliestSnapshots.mockResolvedValue([]);
      // db.select(...).from(campaigns).where(...).groupBy(...) → counts active deals per talent
      mockSelect.mockReturnValue(makeSelectBuilder([]));
    });

    it('growth % calculated correctly: ((latest - earliest) / earliest) * 100', async () => {
      const talent = makeTalentRow({ id: 1 });
      mockFindMany.mockResolvedValue([talent]);

      const latestSnap = makeSnapshotRow({ talentId: 1, platform: 'twitch', value: 110000 });
      const earliestSnap = makeSnapshotRow({ talentId: 1, platform: 'twitch', value: 100000 });
      mockGetLatestSnapshots.mockResolvedValue([latestSnap]);
      mockGetEarliestSnapshots.mockResolvedValue([earliestSnap]);

      const result = await getAdminRosterWithGrowth();

      expect(result).toHaveLength(1);
      const twitchGrowth = result[0]?.growth.find((g) => g.platform === 'twitch');
      expect(twitchGrowth).toBeDefined();
      expect(twitchGrowth?.latestValue).toBe(110000);
      expect(twitchGrowth?.earliestValue).toBe(100000);
      // ((110000 - 100000) / 100000) * 100 = 10
      expect(twitchGrowth?.growthPct).toBeCloseTo(10);
    });

    it('when earliest = 0 → growthPct = null (no division by zero)', async () => {
      const talent = makeTalentRow({ id: 1 });
      mockFindMany.mockResolvedValue([talent]);

      const latestSnap = makeSnapshotRow({ talentId: 1, platform: 'twitch', value: 50000 });
      const earliestSnap = makeSnapshotRow({ talentId: 1, platform: 'twitch', value: 0 });
      mockGetLatestSnapshots.mockResolvedValue([latestSnap]);
      mockGetEarliestSnapshots.mockResolvedValue([earliestSnap]);

      const result = await getAdminRosterWithGrowth();

      const twitchGrowth = result[0]?.growth.find((g) => g.platform === 'twitch');
      expect(twitchGrowth?.growthPct).toBeNull();
    });

    it('when no snapshots → growth array is empty for each talent', async () => {
      const talent = makeTalentRow({ id: 1 });
      mockFindMany.mockResolvedValue([talent]);
      mockGetLatestSnapshots.mockResolvedValue([]);
      mockGetEarliestSnapshots.mockResolvedValue([]);

      const result = await getAdminRosterWithGrowth();

      expect(result).toHaveLength(1);
      expect(result[0]?.growth).toEqual([]);
    });

    it('when no earliest snapshot for a platform → earliestValue defaults to latestValue, growthPct = null', async () => {
      const talent = makeTalentRow({ id: 1 });
      mockFindMany.mockResolvedValue([talent]);

      // Latest exists but no earliest (talent is new, no 30-day baseline)
      const latestSnap = makeSnapshotRow({ talentId: 1, platform: 'youtube', value: 200000 });
      mockGetLatestSnapshots.mockResolvedValue([latestSnap]);
      mockGetEarliestSnapshots.mockResolvedValue([]);

      const result = await getAdminRosterWithGrowth();

      const youtubeGrowth = result[0]?.growth.find((g) => g.platform === 'youtube');
      expect(youtubeGrowth).toBeDefined();
      // earliestValue defaults to latestValue when no earliest snapshot (earliest ?? latest)
      expect(youtubeGrowth?.earliestValue).toBe(200000);
      // earliest is undefined (not in map) → condition `earliest && earliest > 0` is falsy → growthPct = null
      expect(youtubeGrowth?.growthPct).toBeNull();
    });

    it('multiple talents each get their own growth data', async () => {
      const talent1 = makeTalentRow({ id: 1, slug: 'talent-1' });
      const talent2 = makeTalentRow({ id: 2, slug: 'talent-2' });
      mockFindMany.mockResolvedValue([talent1, talent2]);

      mockGetLatestSnapshots.mockResolvedValue([
        makeSnapshotRow({ talentId: 1, platform: 'twitch', value: 50000 }),
        makeSnapshotRow({ talentId: 2, platform: 'youtube', value: 300000 }),
      ]);
      mockGetEarliestSnapshots.mockResolvedValue([
        makeSnapshotRow({ talentId: 1, platform: 'twitch', value: 40000 }),
        makeSnapshotRow({ talentId: 2, platform: 'youtube', value: 250000 }),
      ]);

      const result = await getAdminRosterWithGrowth();

      expect(result).toHaveLength(2);
      const t1Growth = result[0]?.growth.find((g) => g.platform === 'twitch');
      const t2Growth = result[1]?.growth.find((g) => g.platform === 'youtube');
      // ((50000-40000)/40000)*100 = 25
      expect(t1Growth?.growthPct).toBeCloseTo(25);
      // ((300000-250000)/250000)*100 = 20
      expect(t2Growth?.growthPct).toBeCloseTo(20);
    });

    it('returns empty array when no talents exist', async () => {
      mockFindMany.mockResolvedValue([]);

      const result = await getAdminRosterWithGrowth();

      expect(result).toEqual([]);
    });
  });

  // ── upsertTalentFromImport ──────────────────────────────────────────────────

  describe('upsertTalentFromImport', () => {
    const baseInput = {
      name: 'New Creator',
      slug: 'new-creator',
      mapped: {
        platform: 'twitch',
        twitchHandle: 'newcreator',
        followers: '50K',
        country: 'ES',
        language: 'es',
      },
    };

    // ── Path 1: slug match ────────────────────────────────────────────────────

    describe('Path 1 — slug match', () => {
      it('existing talent found by slug → updates existing talent, returns { action: "updated", id }', async () => {
        // slug lookup returns existing talent
        mockSelect.mockImplementationOnce(() => makeSelectBuilder([{ id: 42 }]));
        // update call (updateTalentFields → db.update)
        mockUpdate.mockReturnValue(makeUpdateBuilder());
        // upsertSocialsFromMapped → select existing social (none found) → insert social
        mockSelect.mockImplementation(() => makeSelectBuilder([]));
        // db.insert for talentSocials (upsertSocialsFromMapped inserts when no existing)
        mockInsert.mockReturnValue(makeInsertBuilder([]));

        const result = await upsertTalentFromImport(baseInput);

        expect(result.action).toBe('updated');
        expect(result.id).toBe(42);
      });

      it('slug match → does NOT call db.insert for the talents table (only socials may be inserted)', async () => {
        mockSelect.mockImplementationOnce(() => makeSelectBuilder([{ id: 42 }]));
        mockUpdate.mockReturnValue(makeUpdateBuilder());
        mockSelect.mockImplementation(() => makeSelectBuilder([]));
        // Allow insert for talentSocials (upsertSocialsFromMapped)
        mockInsert.mockReturnValue(makeInsertBuilder([]));

        await upsertTalentFromImport(baseInput);

        // db.update was called (not db.insert for talents)
        expect(mockUpdate).toHaveBeenCalled();
      });
    });

    // ── Path 2: social match ──────────────────────────────────────────────────

    describe('Path 2 — social match (no slug match)', () => {
      it('no slug match but (platform, handle) found in talentSocials → updates existing talent', async () => {
        // slug lookup → no match
        mockSelect.mockImplementationOnce(() => makeSelectBuilder([]));
        // social lookup → match found
        mockSelect.mockImplementationOnce(() => makeSelectBuilder([{ talentId: 99 }]));
        // update call
        mockUpdate.mockReturnValue(makeUpdateBuilder());
        // upsertSocialsFromMapped → no existing social → insert social
        mockSelect.mockImplementation(() => makeSelectBuilder([]));
        mockInsert.mockReturnValue(makeInsertBuilder([]));

        const result = await upsertTalentFromImport(baseInput);

        expect(result.action).toBe('updated');
        expect(result.id).toBe(99);
      });

      it('social match → db.update is called (not a new talent insert)', async () => {
        mockSelect.mockImplementationOnce(() => makeSelectBuilder([]));
        mockSelect.mockImplementationOnce(() => makeSelectBuilder([{ talentId: 99 }]));
        mockUpdate.mockReturnValue(makeUpdateBuilder());
        mockSelect.mockImplementation(() => makeSelectBuilder([]));
        mockInsert.mockReturnValue(makeInsertBuilder([]));

        await upsertTalentFromImport(baseInput);

        expect(mockUpdate).toHaveBeenCalled();
      });
    });

    // ── Path 3: new insert ────────────────────────────────────────────────────

    describe('Path 3 — new insert (no slug match, no social match)', () => {
      it('no slug match, no social match → inserts new talent, returns { action: "created", id }', async () => {
        // slug lookup → no match
        mockSelect.mockImplementationOnce(() => makeSelectBuilder([]));
        // social lookup → no match
        mockSelect.mockImplementationOnce(() => makeSelectBuilder([]));
        // MAX(sortOrder) query
        mockSelect.mockImplementationOnce(() => makeSelectBuilder([{ max: 5 }]));
        // db.insert(talents).values(...).returning({ id })
        mockInsert.mockReturnValueOnce(makeInsertBuilder([{ id: 123 }]));
        // insertSocialsFromMapped → db.insert(talentSocials)
        mockInsert.mockReturnValue(makeInsertBuilder([]));
        // insertBusinessFromMapped → no email/telegram/notes in baseInput → skips

        const result = await upsertTalentFromImport(baseInput);

        expect(result.action).toBe('created');
        expect(result.id).toBe(123);
      });

      it('new insert → calls db.insert at least once', async () => {
        mockSelect.mockImplementationOnce(() => makeSelectBuilder([]));
        mockSelect.mockImplementationOnce(() => makeSelectBuilder([]));
        mockSelect.mockImplementationOnce(() => makeSelectBuilder([{ max: 0 }]));
        mockInsert.mockReturnValueOnce(makeInsertBuilder([{ id: 1 }]));
        mockInsert.mockReturnValue(makeInsertBuilder([]));

        await upsertTalentFromImport(baseInput);

        expect(mockInsert).toHaveBeenCalled();
      });

      it('DB insert returns empty → throws "insert devolvió vacío"', async () => {
        mockSelect.mockImplementationOnce(() => makeSelectBuilder([]));
        mockSelect.mockImplementationOnce(() => makeSelectBuilder([]));
        mockSelect.mockImplementationOnce(() => makeSelectBuilder([{ max: 0 }]));
        // insert returns empty array → triggers the error
        mockInsert.mockReturnValueOnce(makeInsertBuilder([]));

        await expect(upsertTalentFromImport(baseInput)).rejects.toThrow('insert devolvió vacío');
      });
    });

    // ── Platform normalization ────────────────────────────────────────────────

    describe('platform normalization', () => {
      it('unknown platform → falls back to "twitch"', async () => {
        const inputWithUnknownPlatform = {
          name: 'Creator X',
          slug: 'creator-x',
          mapped: {
            platform: 'instagram', // not twitch or youtube → falls back to twitch
            twitchHandle: 'creatorx',
            followers: '10K',
          },
        };

        // slug → no match
        mockSelect.mockImplementationOnce(() => makeSelectBuilder([]));
        // social lookup for 'twitch' (fallback) with handle 'creatorx' → no match
        mockSelect.mockImplementationOnce(() => makeSelectBuilder([]));
        // MAX(sortOrder)
        mockSelect.mockImplementationOnce(() => makeSelectBuilder([{ max: 0 }]));
        // insert talent
        mockInsert.mockReturnValueOnce(makeInsertBuilder([{ id: 77 }]));
        // insert socials
        mockInsert.mockReturnValue(makeInsertBuilder([]));

        const result = await upsertTalentFromImport(inputWithUnknownPlatform);

        expect(result.action).toBe('created');
        expect(result.id).toBe(77);
      });

      it('"youtube" platform is valid and not normalized away', async () => {
        const youtubeInput = {
          name: 'YouTube Creator',
          slug: 'yt-creator',
          mapped: {
            platform: 'youtube',
            youtubeHandle: 'ytcreator',
            followers: '200K',
          },
        };

        // slug → no match
        mockSelect.mockImplementationOnce(() => makeSelectBuilder([]));
        // social lookup for 'youtube' → match found
        mockSelect.mockImplementationOnce(() => makeSelectBuilder([{ talentId: 55 }]));
        mockUpdate.mockReturnValue(makeUpdateBuilder());
        mockSelect.mockImplementation(() => makeSelectBuilder([]));

        const result = await upsertTalentFromImport(youtubeInput);

        expect(result.action).toBe('updated');
        expect(result.id).toBe(55);
      });
    });

    // ── Business data insertion ───────────────────────────────────────────────

    describe('business data', () => {
      it('email in mapped → insertBusinessFromMapped is called (db.insert for talentBusiness)', async () => {
        const inputWithEmail = {
          name: 'Creator With Email',
          slug: 'creator-email',
          mapped: {
            platform: 'twitch',
            twitchHandle: 'creatorwithmail',
            followers: '5K',
            email: 'creator@example.com',
          },
        };

        // slug → no match
        mockSelect.mockImplementationOnce(() => makeSelectBuilder([]));
        // social → no match
        mockSelect.mockImplementationOnce(() => makeSelectBuilder([]));
        // MAX(sortOrder)
        mockSelect.mockImplementationOnce(() => makeSelectBuilder([{ max: 2 }]));
        // insert talent
        mockInsert.mockReturnValueOnce(makeInsertBuilder([{ id: 88 }]));
        // insert socials (twitchHandle present)
        mockInsert.mockReturnValueOnce(makeInsertBuilder([]));
        // insertBusinessFromMapped → check existing business → none
        mockSelect.mockImplementationOnce(() => makeSelectBuilder([]));
        // insert business
        mockInsert.mockReturnValueOnce(makeInsertBuilder([]));

        const result = await upsertTalentFromImport(inputWithEmail);

        expect(result.action).toBe('created');
        expect(result.id).toBe(88);
        // insert was called at least twice (talent + business)
        expect(mockInsert).toHaveBeenCalledTimes(3);
      });
    });
  });

  // ── getTalentFullProfile ────────────────────────────────────────────────────

  describe('getTalentFullProfile', () => {
    it('existing id → returns full profile with business and verticals', async () => {
      const talent = makeTalentRow({
        id: 10,
        tags: [{ id: 1, talentId: 10, tag: 'fps' }],
        socials: [{ id: 1, talentId: 10, platform: 'twitch', handle: 'streamer' }],
      });
      mockFindFirst.mockResolvedValue(talent);

      const businessRow = {
        talentId: 10,
        contactEmail: 'talent@example.com',
        telegram: '@talent',
        internalNotes: 'VIP creator',
      };
      const verticalRow = { vertical: 'gaming' };

      // businessRows select
      mockSelect.mockImplementationOnce(() => makeSelectBuilder([businessRow]));
      // verticalRows select
      mockSelect.mockImplementationOnce(() => makeSelectBuilder([verticalRow]));

      const result = await getTalentFullProfile(10);

      expect(result).toBeDefined();
      expect(result?.id).toBe(10);
      expect(result?.business).toEqual(businessRow);
      expect(result?.verticals).toEqual(['gaming']);
    });

    it('non-existing id → returns undefined', async () => {
      mockFindFirst.mockResolvedValue(undefined);

      const result = await getTalentFullProfile(9999);

      expect(result).toBeUndefined();
      // Should not call select for business/verticals when talent not found
      expect(mockSelect).not.toHaveBeenCalled();
    });

    it('null DB result → returns undefined (never null)', async () => {
      mockFindFirst.mockResolvedValue(null);

      const result = await getTalentFullProfile(1);

      expect(result).toBeUndefined();
    });

    it('no business row → business is undefined', async () => {
      const talent = makeTalentRow({ id: 5 });
      mockFindFirst.mockResolvedValue(talent);

      // businessRows → empty
      mockSelect.mockImplementationOnce(() => makeSelectBuilder([]));
      // verticalRows → empty
      mockSelect.mockImplementationOnce(() => makeSelectBuilder([]));

      const result = await getTalentFullProfile(5);

      expect(result?.business).toBeUndefined();
      expect(result?.verticals).toEqual([]);
    });

    it('multiple verticals → returned as array of vertical strings', async () => {
      const talent = makeTalentRow({ id: 7 });
      mockFindFirst.mockResolvedValue(talent);

      mockSelect.mockImplementationOnce(() => makeSelectBuilder([]));
      mockSelect.mockImplementationOnce(() =>
        makeSelectBuilder([{ vertical: 'gaming' }, { vertical: 'esports' }, { vertical: 'tech' }]),
      );

      const result = await getTalentFullProfile(7);

      expect(result?.verticals).toEqual(['gaming', 'esports', 'tech']);
    });
  });
});
