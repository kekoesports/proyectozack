import fc from 'fast-check';

import { computeCampaignDerived } from '@/lib/schemas/campaign';

/* -------------------------------------------------------------------------- */
/*  Property-based fuzz tests for computeCampaignDerived                      */
/*  Goal: mathematical invariants hold for all valid numeric inputs            */
/* -------------------------------------------------------------------------- */

describe('computeCampaignDerived — property-based', () => {
  // Invariant 1: commissionAmount >= 0 when amountTalent <= amountBrand
  it('commissionAmount is always non-negative when amountTalent <= amountBrand', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 0, max: 1_000_000, noNaN: true }),
        fc.float({ min: 0, max: 1, noNaN: true }), // ratio in [0, 1]
        (brand, ratio) => {
          const talent = brand * ratio;
          const result = computeCampaignDerived({ amountBrand: brand, amountTalent: talent });
          return result.commissionAmount >= 0;
        },
      ),
      { numRuns: 5_000 },
    );
  });

  // Invariant 2: commissionPct in [0, 100]
  it('commissionPct is always in [0, 100] when amountTalent <= amountBrand', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 0, max: 1_000_000, noNaN: true }),
        fc.float({ min: 0, max: 1, noNaN: true }),
        (brand, ratio) => {
          const talent = brand * ratio;
          const result = computeCampaignDerived({ amountBrand: brand, amountTalent: talent });
          return result.commissionPct >= 0 && result.commissionPct <= 100;
        },
      ),
      { numRuns: 5_000 },
    );
  });

  // Invariant 3: commissionAmount === amountBrand - amountTalent (within float precision)
  it('commissionAmount equals amountBrand minus amountTalent', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 0, max: 1_000_000, noNaN: true }),
        fc.float({ min: 0, max: 1, noNaN: true }),
        (brand, ratio) => {
          const talent = brand * ratio;
          const result = computeCampaignDerived({ amountBrand: brand, amountTalent: talent });
          const expected = brand - talent;
          // Allow tiny floating-point epsilon
          return Math.abs(result.commissionAmount - expected) < 1e-6;
        },
      ),
      { numRuns: 5_000 },
    );
  });

  // Invariant 4: amountBrand = 0 → commissionPct = 0 (no NaN, no Infinity)
  it('amountBrand=0 → commissionPct=0 (no NaN, no Infinity)', () => {
    const result = computeCampaignDerived({ amountBrand: 0, amountTalent: 0 });
    expect(result.commissionPct).toBe(0);
    expect(Number.isFinite(result.commissionPct)).toBe(true);
    expect(Number.isNaN(result.commissionPct)).toBe(false);
  });

  // Invariant 5: amountBrand = amountTalent → commissionAmount = 0, commissionPct = 0
  it('amountBrand = amountTalent → commissionAmount = 0, commissionPct = 0', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 0, max: 1_000_000, noNaN: true }),
        (amount) => {
          const result = computeCampaignDerived({
            amountBrand: amount,
            amountTalent: amount,
          });
          return (
            Math.abs(result.commissionAmount) < 1e-6 &&
            Math.abs(result.commissionPct) < 1e-6
          );
        },
      ),
      { numRuns: 2_000 },
    );
  });

  // Invariant 6: amountTalent = 0 → commissionAmount = amountBrand, commissionPct = 100
  it('amountTalent=0 → commissionAmount=amountBrand, commissionPct=100', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1_000_000 }), // brand > 0 to avoid 0/0; integers are exact
        (brand) => {
          const result = computeCampaignDerived({ amountBrand: brand, amountTalent: 0 });
          return (
            Math.abs(result.commissionAmount - brand) < 1e-6 &&
            Math.abs(result.commissionPct - 100) < 1e-6
          );
        },
      ),
      { numRuns: 2_000 },
    );
  });

  // Invariant 7: result is always finite (no NaN, no Infinity) for valid inputs
  it('result is always finite for valid non-negative inputs with talent <= brand', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 0, max: 1_000_000, noNaN: true }),
        fc.float({ min: 0, max: 1, noNaN: true }),
        (brand, ratio) => {
          const talent = brand * ratio;
          const result = computeCampaignDerived({ amountBrand: brand, amountTalent: talent });
          return (
            Number.isFinite(result.commissionAmount) &&
            Number.isFinite(result.commissionPct)
          );
        },
      ),
      { numRuns: 5_000 },
    );
  });

  // Invariant 8: string inputs produce same result as numeric inputs
  it('string numeric inputs produce same result as numeric inputs', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 100_000 }),
        fc.integer({ min: 0, max: 100_000 }),
        (brand, talent) => {
          if (talent > brand) return true; // skip invalid combos
          const numericResult = computeCampaignDerived({
            amountBrand: brand,
            amountTalent: talent,
          });
          const stringResult = computeCampaignDerived({
            amountBrand: String(brand),
            amountTalent: String(talent),
          });
          return (
            numericResult.commissionAmount === stringResult.commissionAmount &&
            numericResult.commissionPct === stringResult.commissionPct
          );
        },
      ),
      { numRuns: 2_000 },
    );
  });
});
