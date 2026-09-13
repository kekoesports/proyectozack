import { checkRateLimit } from '@/lib/security/rateLimit';
import { checkBudget, estimateCostMicros } from '@/lib/agents/budget';

describe('cost and abuse boundaries', () => {
  afterEach(() => jest.restoreAllMocks());

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
