import { toLocalIsoDate, todayLocalIso, startOfLocalYearIso } from '@/lib/utils/date';

describe('date utils', () => {
  describe('toLocalIsoDate', () => {
    it('formats a normal date correctly', () => {
      // new Date(year, month0, day) — local time, no UTC confusion
      expect(toLocalIsoDate(new Date(2026, 3, 15))).toBe('2026-04-15');
    });

    it('pads a single-digit month with a leading zero (January)', () => {
      expect(toLocalIsoDate(new Date(2026, 0, 20))).toBe('2026-01-20');
    });

    it('pads a single-digit day with a leading zero', () => {
      expect(toLocalIsoDate(new Date(2026, 3, 5))).toBe('2026-04-05');
    });

    it('handles December 31st', () => {
      expect(toLocalIsoDate(new Date(2025, 11, 31))).toBe('2025-12-31');
    });

    it('handles January 1st', () => {
      expect(toLocalIsoDate(new Date(2026, 0, 1))).toBe('2026-01-01');
    });

    it('handles leap year February 29th', () => {
      expect(toLocalIsoDate(new Date(2024, 1, 29))).toBe('2024-02-29');
    });
  });

  describe('todayLocalIso', () => {
    afterEach(() => {
      jest.useRealTimers();
    });

    it('returns the local calendar date for the mocked system time', () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date(2026, 5, 7));

      expect(todayLocalIso()).toBe('2026-06-07');
    });
  });

  describe('startOfLocalYearIso', () => {
    afterEach(() => {
      jest.useRealTimers();
    });

    it('returns January 1st of the given date\'s year', () => {
      expect(startOfLocalYearIso(new Date(2026, 6, 15))).toBe('2026-01-01');
    });

    it('returns January 1st of the current year when no argument is provided', () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date(2026, 5, 7));

      expect(startOfLocalYearIso()).toBe('2026-01-01');
    });
  });
});
