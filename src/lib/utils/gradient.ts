/** Returns a 135° linear gradient string from two hex colors. */
export function gradientStyle(c1: string, c2: string): string {
  return `linear-gradient(135deg, ${c1} 0%, ${c2} 100%)`;
}

/** The SocialPro primary brand gradient (orange → pink → purple). */
export const BRAND_GRADIENT =
  'linear-gradient(135deg, #f5632a 0%, #e03070 35%, #c42880 62%, #8b3aad 100%)';
