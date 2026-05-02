import { timingSafeEqual } from '@/lib/security/timingSafeEqual';

describe('timingSafeEqual', () => {
  it('returns true for identical strings', () => {
    expect(timingSafeEqual('abc123', 'abc123')).toBe(true);
  });

  it('returns false for different strings of same length', () => {
    expect(timingSafeEqual('abc123', 'abc124')).toBe(false);
  });

  it('returns false for different lengths (without comparing bytes)', () => {
    expect(timingSafeEqual('abc', 'abcd')).toBe(false);
    expect(timingSafeEqual('abcd', 'abc')).toBe(false);
  });

  it('returns true for two empty strings', () => {
    expect(timingSafeEqual('', '')).toBe(true);
  });

  it('returns false comparing empty against non-empty', () => {
    expect(timingSafeEqual('', 'a')).toBe(false);
    expect(timingSafeEqual('a', '')).toBe(false);
  });

  it('handles unicode multi-byte: same emoji → true', () => {
    expect(timingSafeEqual('🚀token', '🚀token')).toBe(true);
  });

  it('handles unicode multi-byte: different emoji → false', () => {
    expect(timingSafeEqual('🚀token', '🎉token')).toBe(false);
  });

  it('returns false when ASCII vs same-codepoint multi-byte (different byte length)', () => {
    // 'ñ' es 2 bytes en UTF-8, 'n' es 1 byte → buffers de longitudes distintas
    expect(timingSafeEqual('mañana', 'manana')).toBe(false);
  });

  it('handles long strings (1KB)', () => {
    const a = 'x'.repeat(1024);
    const b = 'x'.repeat(1024);
    expect(timingSafeEqual(a, b)).toBe(true);
    const c = 'x'.repeat(1023) + 'y';
    expect(timingSafeEqual(a, c)).toBe(false);
  });
});
