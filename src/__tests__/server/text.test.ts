import { truncateMetaDescription, truncateMetaTitle } from '@/lib/utils/text';

describe('text utils', () => {
  describe('truncateMetaDescription', () => {
    it('returns undefined for undefined input', () => {
      expect(truncateMetaDescription(undefined)).toBeUndefined();
    });

    it('returns undefined for empty string', () => {
      expect(truncateMetaDescription('')).toBeUndefined();
    });

    it('returns the string as-is when length is below 155 chars', () => {
      const short = 'A'.repeat(100);
      expect(truncateMetaDescription(short)).toBe(short);
    });

    it('returns the string as-is when length is exactly 155 chars', () => {
      const exact = 'A'.repeat(155);
      expect(truncateMetaDescription(exact)).toBe(exact);
    });

    it('truncates with … when length is 156 chars', () => {
      const long = 'A'.repeat(156);
      const result = truncateMetaDescription(long);
      expect(result).toBe('A'.repeat(155) + '…');
    });

    it('trims trailing spaces before appending … when text ends in spaces at the cut point', () => {
      // First 155 chars end in spaces; trimEnd should remove them before adding …
      const base = 'A'.repeat(150) + '     ';  // 155 chars, all spaces at end
      const extra = 'B'.repeat(10);             // pushes total to 165 chars
      const input = base + extra;
      const result = truncateMetaDescription(input);
      // slice(0, 155) = 'A'.repeat(150) + '     ', trimEnd → 'A'.repeat(150), then + '…'
      expect(result).toBe('A'.repeat(150) + '…');
    });
  });

  describe('truncateMetaTitle', () => {
    it('returns the string as-is when length is below 55 chars', () => {
      const short = 'A'.repeat(30);
      expect(truncateMetaTitle(short)).toBe(short);
    });

    it('returns the string as-is when length is exactly 55 chars', () => {
      const exact = 'A'.repeat(55);
      expect(truncateMetaTitle(exact)).toBe(exact);
    });

    it('truncates with … when length is 56 chars', () => {
      const long = 'A'.repeat(56);
      const result = truncateMetaTitle(long);
      expect(result).toBe('A'.repeat(55) + '…');
    });

    it('trims trailing spaces before appending … when text ends in spaces at the cut point', () => {
      // First 55 chars end in spaces; trimEnd should remove them before adding …
      const base = 'A'.repeat(50) + '     ';  // 55 chars, spaces at end
      const extra = 'B'.repeat(5);             // pushes total to 60 chars
      const input = base + extra;
      const result = truncateMetaTitle(input);
      // slice(0, 55) = 'A'.repeat(50) + '     ', trimEnd → 'A'.repeat(50), then + '…'
      expect(result).toBe('A'.repeat(50) + '…');
    });
  });
});
