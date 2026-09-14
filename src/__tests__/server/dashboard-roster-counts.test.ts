import { getAdminDashboardData } from '@/lib/queries/dashboard-overview';

const mockRoster = [
  { name: 'Visible', slug: 'visible', visibility: 'public', archivedAt: null, socials: [] },
  { name: 'Internal', slug: 'internal', visibility: 'internal', archivedAt: null, socials: [] },
  { name: 'Archived', slug: 'archived', visibility: 'public', archivedAt: new Date(), socials: [] },
];

jest.mock('@/lib/queries/talents', () => ({
  getAllTalents: jest.fn(async () => mockRoster.filter((talent) => talent.archivedAt === null)),
}));
jest.mock('@/lib/queries/agencyCreators', () => ({ countAgencyCreators: async () => 1 }));
jest.mock('@/lib/db', () => ({
  db: {
    select: () => ({
      from: () => ({
        where: async () => [{ count: 156 }],
        then: (resolve: (rows: { count: number }[]) => void) => resolve([{ count: 156 }]),
      }),
    }),
  },
}));

describe('dashboard roster counts', () => {
  it('uses the linked non-archived roster, including internal creators', async () => {
    const result = await getAdminDashboardData();
    expect(result.stats).toMatchObject({ talentCount: 2, publicCount: 1, internalCount: 1 });
    expect(result.topCreators.map((creator) => creator.slug)).toEqual(['visible', 'internal']);
  });

  it('keeps counts independent of the top ranking limit', async () => {
    const result = await getAdminDashboardData(1);
    expect(result.stats.talentCount).toBe(2);
    expect(result.topCreators).toHaveLength(1);
  });
});
