import {
  getIsoWeekLabel,
  parseWeekLabel,
  getWeekStart,
  getWeekEnd,
  previousWeek,
  nextWeek,
} from '@/lib/utils/week';

describe('week utils', () => {
  describe('getIsoWeekLabel', () => {
    it('returns the correct ISO week label for a normal week', () => {
      // 2026-04-20T10:00:00Z → Madrid civil date: 2026-04-20 (Mon) → 2026-W17
      expect(getIsoWeekLabel(new Date('2026-04-20T10:00:00Z'))).toBe('2026-W17');
    });

    it('handles ISO year boundary: Dec 31 2020 belongs to 2020-W53', () => {
      // Dec 31 2020 is a Thursday — the Thursday of its week is in 2020 → ISO year 2020
      expect(getIsoWeekLabel(new Date('2020-12-31T12:00:00Z'))).toBe('2020-W53');
    });

    it('returns 2021-W01 for Jan 4 2021', () => {
      // Jan 4 is always in ISO week 1 of its calendar year
      expect(getIsoWeekLabel(new Date('2021-01-04T12:00:00Z'))).toBe('2021-W01');
    });

    it('returns 2020-W53 for Jan 1 2021 (belongs to previous ISO year)', () => {
      // Jan 1 2021 is a Friday; its Thursday (Dec 31 2020) is in 2020 → ISO year 2020
      expect(getIsoWeekLabel(new Date('2021-01-01T12:00:00Z'))).toBe('2020-W53');
    });

    it('uses Madrid civil date: Sunday 23:30 Madrid stays in the same week', () => {
      // 2026-04-26T21:30:00Z = 23:30 Madrid (CEST, UTC+2) → still Sunday Apr 26 → 2026-W17
      expect(getIsoWeekLabel(new Date('2026-04-26T21:30:00Z'))).toBe('2026-W17');
    });
  });

  describe('parseWeekLabel', () => {
    it('parses a valid label into year and week', () => {
      expect(parseWeekLabel('2026-W17')).toEqual({ year: 2026, week: 17 });
    });

    it('parses a 53-week year label correctly', () => {
      expect(parseWeekLabel('2020-W53')).toEqual({ year: 2020, week: 53 });
    });

    it('throws for a completely invalid format', () => {
      expect(() => parseWeekLabel('invalid')).toThrow('Invalid week label: invalid');
    });

    it('throws when the W prefix is missing', () => {
      expect(() => parseWeekLabel('2026-17')).toThrow('Invalid week label: 2026-17');
    });

    it('throws when the week number has only one digit', () => {
      expect(() => parseWeekLabel('2026-W1')).toThrow('Invalid week label: 2026-W1');
    });

    it('throws for an empty string', () => {
      expect(() => parseWeekLabel('')).toThrow('Invalid week label: ');
    });
  });

  describe('getWeekStart', () => {
    it('returns a Date whose Madrid weekday is Monday for 2026-W17', () => {
      const start = getWeekStart('2026-W17');
      const weekday = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Europe/Madrid',
        weekday: 'long',
      }).format(start);
      expect(weekday).toBe('Monday');
    });

    it('returns the correct UTC instant for 2026-W17 start (Mon Apr 20 00:00 Madrid = 2026-04-19T22:00Z)', () => {
      // Madrid is CEST (UTC+2) in April → Monday 00:00 Madrid = Sunday 22:00 UTC
      expect(getWeekStart('2026-W17').toISOString()).toBe('2026-04-19T22:00:00.000Z');
    });

    it('returns a Monday in Madrid for 2020-W53', () => {
      const start = getWeekStart('2020-W53');
      const weekday = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Europe/Madrid',
        weekday: 'long',
      }).format(start);
      expect(weekday).toBe('Monday');
    });

    it('returns the correct UTC instant for 2020-W53 start (Mon Dec 28 00:00 Madrid = 2020-12-27T23:00Z)', () => {
      // Madrid is CET (UTC+1) in December → Monday 00:00 Madrid = Sunday 23:00 UTC
      expect(getWeekStart('2020-W53').toISOString()).toBe('2020-12-27T23:00:00.000Z');
    });

    it('returns a Monday in Madrid for 2021-W01', () => {
      const start = getWeekStart('2021-W01');
      const weekday = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Europe/Madrid',
        weekday: 'long',
      }).format(start);
      expect(weekday).toBe('Monday');
    });
  });

  describe('getWeekEnd', () => {
    it('returns a Date exactly 7 days minus 1ms after the week start', () => {
      const start = getWeekStart('2026-W17');
      const end = getWeekEnd('2026-W17');
      expect(end.getTime() - start.getTime()).toBe(7 * 24 * 60 * 60 * 1000 - 1);
    });

    it('start is strictly before end', () => {
      const start = getWeekStart('2026-W17');
      const end = getWeekEnd('2026-W17');
      expect(start.getTime()).toBeLessThan(end.getTime());
    });

    it('returns the correct UTC instant for 2026-W17 end', () => {
      // End = start + 7*86400000 - 1 = 2026-04-19T22:00:00Z + 604799999ms = 2026-04-26T21:59:59.999Z
      expect(getWeekEnd('2026-W17').toISOString()).toBe('2026-04-26T21:59:59.999Z');
    });
  });

  describe('previousWeek', () => {
    it('returns the preceding week label', () => {
      expect(previousWeek('2026-W17')).toBe('2026-W16');
    });

    it('crosses the year boundary: previousWeek(2021-W01) → 2020-W53', () => {
      expect(previousWeek('2021-W01')).toBe('2020-W53');
    });
  });

  describe('nextWeek', () => {
    it('returns the following week label', () => {
      expect(nextWeek('2026-W17')).toBe('2026-W18');
    });

    it('crosses the year boundary: nextWeek(2020-W53) → 2021-W01', () => {
      expect(nextWeek('2020-W53')).toBe('2021-W01');
    });
  });
});
