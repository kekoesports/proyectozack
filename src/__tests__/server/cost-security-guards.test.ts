import { checkBudget, estimateCostMicros } from '@/lib/agents/budget';

describe('cost and abuse boundaries', () => {
  let checkRateLimit: typeof import('@/lib/security/rateLimit').checkRateLimit;
  beforeEach(() => {
    jest.isolateModules(() => {
      checkRateLimit = jest.requireActual<typeof import('@/lib/security/rateLimit')>('@/lib/security/rateLimit').checkRateLimit;
    });
  });
  afterEach(() => jest.restoreAllMocks());

  it.each([NaN, Infinity, -1, 1.5, Number.MAX_SAFE_INTEGER + 1])('rejects invalid cached input tokens %s', (cached) => {
    for (const [provider, model] of [['xai', 'grok-4.3'], ['gemini', 'gemini-2.5-flash']] as const) {
      expect(estimateCostMicros(provider, model, 100, 10, cached))
        .toEqual({ estimatedCostMicros: 0, pricingUnknown: true });
    }
  });

  it.each([null, 0, 100])('accepts valid cached input tokens %s', (cached) => {
    expect(estimateCostMicros('xai', 'grok-4.3', 100, 10, cached).pricingUnknown).toBe(false);
  });

  it('retains active counters when the clock retreats after a sweep', () => {
    const clock = jest.spyOn(Date, 'now').mockReturnValue(3_000_000_000_000);
    const opts = { key: 'clock-active', limit: 1, windowMs: 60_000 };
    expect(checkRateLimit(opts).ok).toBe(true);
    clock.mockReturnValue(2_999_999_000_000);
    expect(checkRateLimit(opts).ok).toBe(false);
  });

  it('recovers capacity after expiry following a backwards clock adjustment', () => {
    const clock = jest.spyOn(Date, 'now').mockReturnValue(4_000_000_000_000);
    expect(checkRateLimit({ key: 'future-counter', limit: 1, windowMs: 60_000 }).ok).toBe(true);
    clock.mockReturnValue(3_999_999_000_000);
    for (let i = 0; i < 4_999; i++) {
      expect(checkRateLimit({ key: `rollback:${i}`, limit: 1, windowMs: 100 }).ok).toBe(true);
    }
    expect(checkRateLimit({ key: 'rollback-overflow', limit: 1, windowMs: 100 }).ok).toBe(false);
    clock.mockReturnValue(3_999_999_001_000);
    expect(checkRateLimit({ key: 'rollback-recovered', limit: 1, windowMs: 100 }).ok).toBe(true);
    expect(checkRateLimit({ key: 'future-counter', limit: 1, windowMs: 60_000 }).ok).toBe(false);
  });

  it.each([NaN, Infinity, -1, 1.5])('rejects invalid accounting %s', (amount) => {
    expect(checkBudget({ globalSpentMicros: amount, globalLimitMicros: 100,
      agentSpentMicros: 0, agentLimitMicros: 100, runSpentMicros: 0,
      runLimitMicros: 0, pricingUnknown: false }).ok).toBe(false);
    expect(estimateCostMicros('gemini', 'gemini-2.5-flash', amount, 1).pricingUnknown).toBe(true);
  });

  it.each(['constructor', '__proto__', 'toString'])('does not treat %s as a model price', (model) => {
    expect(estimateCostMicros('gemini', model, 10, 10)).toEqual({ estimatedCostMicros: 0, pricingUnknown: true });
  });

  it.each([0, -1, NaN, Infinity, 1.5])('blocks invalid limiter configuration %s', (limit) => {
    expect(checkRateLimit({ key: 'invalid', limit, windowMs: 60_000 }).ok).toBe(false);
    expect(checkRateLimit({ key: 'invalid', limit: 1, windowMs: limit }).ok).toBe(false);
  });

  it('bounds unique keys without dropping active counters; recovers after expiry', () => {
    const clock = jest.spyOn(Date, 'now').mockReturnValue(2_000_000_000_000);
    for (let i = 0; i < 5_000; i++) {
      expect(checkRateLimit({ key: `capacity:${i}`, limit: 1, windowMs: 60_000 }).ok).toBe(true);
    }
    expect(checkRateLimit({ key: 'overflow', limit: 1, windowMs: 60_000 }).ok).toBe(false);
    expect(checkRateLimit({ key: 'capacity:0', limit: 1, windowMs: 60_000 }).ok).toBe(false);
    clock.mockReturnValue(2_000_000_060_000);
    expect(checkRateLimit({ key: 'overflow', limit: 1, windowMs: 60_000 }).ok).toBe(true);
  });
});
