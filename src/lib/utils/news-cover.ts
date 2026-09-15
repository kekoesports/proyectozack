import type { CSSProperties } from 'react';

/** Keep text inside our editorial artwork visible in different card ratios. */
export function newsCoverStyle(url: string): CSSProperties | undefined {
  return url.startsWith('https://socialpro.es/images/news/')
    ? { objectFit: 'contain' }
    : undefined;
}
