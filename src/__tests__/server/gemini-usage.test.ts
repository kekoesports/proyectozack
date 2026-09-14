import { geminiBillableUsage } from '@/lib/schemas/gemini-usage';

describe('Gemini billable reasoning', () => {
  it('includes reasoning once, without double-counting total tokens', () => {
    expect(geminiBillableUsage({ promptTokenCount: 1000, candidatesTokenCount: 200,
      thoughtsTokenCount: 700, totalTokenCount: 1900, cachedContentTokenCount: 300 }))
      .toEqual({ inputTokens: 1000, outputTokens: 900, cachedInputTokens: 300 });
  });
  it('uses the total when the provider omits the reasoning breakdown', () => {
    expect(geminiBillableUsage({ promptTokenCount: 1000, candidatesTokenCount: 200, totalTokenCount: 1900 })?.outputTokens).toBe(900);
  });
  it('accounts for a response spent entirely on reasoning', () => {
    expect(geminiBillableUsage({ promptTokenCount: 100, candidatesTokenCount: 0, thoughtsTokenCount: 300 })?.outputTokens).toBe(300);
  });
  it('preserves a measured zero and rejects missing or invalid usage', () => {
    expect(geminiBillableUsage({ promptTokenCount: 0, candidatesTokenCount: 0 })?.outputTokens).toBe(0);
    for (const raw of [undefined, {}, {promptTokenCount: 1}, {promptTokenCount: -1},
      {promptTokenCount: '1', candidatesTokenCount: 2}, {promptTokenCount: 1, candidatesTokenCount: NaN},
      {promptTokenCount: 2, candidatesTokenCount: 1, totalTokenCount: 1},
      {promptTokenCount: 2, candidatesTokenCount: 1, cachedContentTokenCount: 3}]) {
      expect(geminiBillableUsage(raw)).toBeNull();
    }
  });
});
