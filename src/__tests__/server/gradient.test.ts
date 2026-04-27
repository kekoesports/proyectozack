import { gradientStyle, BRAND_GRADIENT } from '@/lib/utils/gradient';

describe('gradientStyle', () => {
  it('returns a 135deg linear-gradient string', () => {
    expect(gradientStyle('#ff0000', '#0000ff')).toBe(
      'linear-gradient(135deg, #ff0000 0%, #0000ff 100%)',
    );
  });

  it('BRAND_GRADIENT starts with the brand orange and ends with purple', () => {
    expect(BRAND_GRADIENT).toMatch(/^linear-gradient/);
    expect(BRAND_GRADIENT).toContain('#f5632a');
    expect(BRAND_GRADIENT).toContain('#8b3aad');
  });
});
