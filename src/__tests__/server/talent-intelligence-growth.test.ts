import { calculateComparableGrowth } from '@/lib/talent-intelligence/growth';

describe('rankings fiables de talento', () => {
  it('no presenta cinco días de datos como crecimiento de 30 días', () => {
    const metric = calculateComparableGrowth([
      { snapshotDate: '2026-08-27', followers: 1_000 },
      { snapshotDate: '2026-09-01', followers: 1_100 },
    ], 30, '2026-09-01');

    expect(metric.eligible).toBe(false);
    expect(metric.reason).toBe('not-enough-history');
    expect(metric.pct).toBeNull();
  });

  it('acepta una base cercana al periodo y calcula el cambio real', () => {
    const metric = calculateComparableGrowth([
      { snapshotDate: '2026-08-06', followers: 1_000 },
      { snapshotDate: '2026-08-20', followers: 1_050 },
      { snapshotDate: '2026-09-01', followers: 1_100 },
    ], 30, '2026-09-01');

    expect(metric.eligible).toBe(true);
    expect(metric.coverageDays).toBe(26);
    expect(metric.absolute).toBe(100);
    expect(metric.pct).toBeCloseTo(10);
    expect(metric.baselineDate).toBe('2026-08-06');
  });

  it.each([
    [60, '2026-07-03'],
    [90, '2026-06-03'],
    [120, '2026-05-04'],
  ] as const)('admite comparaciones completas de %i días', (period, baselineDate) => {
    const metric = calculateComparableGrowth([
      { snapshotDate: baselineDate, followers: 2_000 },
      { snapshotDate: '2026-09-01', followers: 2_400 },
    ], period, '2026-09-01');

    expect(metric.eligible).toBe(true);
    expect(metric.absolute).toBe(400);
    expect(metric.pct).toBeCloseTo(20);
  });

  it('excluye del ranking una medición desactualizada', () => {
    const metric = calculateComparableGrowth([
      { snapshotDate: '2026-07-20', followers: 1_000 },
      { snapshotDate: '2026-08-20', followers: 1_200 },
    ], 30, '2026-09-01');

    expect(metric.eligible).toBe(false);
    expect(metric.reason).toBe('stale');
  });

  it('rechaza audiencias a cero aunque exista histórico', () => {
    const metric = calculateComparableGrowth([
      { snapshotDate: '2026-08-01', followers: 100 },
      { snapshotDate: '2026-09-01', followers: 0 },
    ], 30, '2026-09-01');

    expect(metric.eligible).toBe(false);
    expect(metric.reason).toBe('missing-audience');
  });

  it('excluye históricos mezclados que alternan dos audiencias incompatibles', () => {
    const metric = calculateComparableGrowth([
      { snapshotDate: '2026-08-01', followers: 355 },
      { snapshotDate: '2026-08-02', followers: 13_300 },
      { snapshotDate: '2026-08-03', followers: 356 },
      { snapshotDate: '2026-09-01', followers: 13_400 },
    ], 30, '2026-09-01');

    expect(metric.eligible).toBe(false);
    expect(metric.reason).toBe('inconsistent-history');
  });
});
