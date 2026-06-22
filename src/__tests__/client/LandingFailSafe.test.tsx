import { readFileSync } from 'node:fs';
import path from 'node:path';

import { render, screen } from '@testing-library/react';

import { SectionTag } from '@/components/ui/SectionTag';
import { CtaSection } from '@/features/marketing-site/components/CtaSection';

/**
 * Locks in the second wave of fixes for the public-landing "black void"
 * bug. Commit 292af91 patched FadeInOnScroll/CtaSection/PortfolioGrid but
 * left SectionTag and the MetricsSection tiles using the same fragile
 * `initial=hidden + whileInView` pattern. These tests assert:
 *
 *   1. The components render their content into the DOM even when the
 *      IntersectionObserver never fires (the production failure mode).
 *   2. The wrappers carry `data-motion-fallback` so the CSS safety net
 *      in globals.css can force them visible if the motion JS chunk
 *      itself fails to load (CSP block, ad-blocker, network drop).
 *   3. globals.css actually defines the `[data-motion-fallback]` rule
 *      and its keyframe — without these the data attributes are inert.
 */

class NoopIntersectionObserver implements IntersectionObserver {
  readonly root: Element | Document | null = null;
  readonly rootMargin = '';
  readonly thresholds: ReadonlyArray<number> = [];
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
}

let originalIO: typeof IntersectionObserver | undefined;

beforeAll(() => {
  originalIO = (globalThis as { IntersectionObserver?: typeof IntersectionObserver })
    .IntersectionObserver;
  Object.defineProperty(globalThis, 'IntersectionObserver', {
    writable: true,
    configurable: true,
    value: NoopIntersectionObserver,
  });
  Object.defineProperty(window, 'IntersectionObserver', {
    writable: true,
    configurable: true,
    value: NoopIntersectionObserver,
  });
});

afterAll(() => {
  if (originalIO) {
    Object.defineProperty(globalThis, 'IntersectionObserver', {
      writable: true,
      configurable: true,
      value: originalIO,
    });
    Object.defineProperty(window, 'IntersectionObserver', {
      writable: true,
      configurable: true,
      value: originalIO,
    });
  }
});

describe('SectionTag (broken-observer regression)', () => {
  it('renders content and exposes data-motion-fallback for the CSS net', () => {
    render(<SectionTag>Resultados</SectionTag>);

    const tag = screen.getByText('Resultados');
    expect(tag).toBeInTheDocument();
    expect(tag).toHaveAttribute('data-motion-fallback');
  });
});

describe('CtaSection (broken-observer regression)', () => {
  it('keeps the CTA content in the DOM and tags the wrapper for CSS fallback', () => {
    render(<CtaSection />);

    expect(screen.getByText(/Soy marca/i)).toBeInTheDocument();

    const wrappers = document.querySelectorAll('[data-motion-fallback]');
    expect(wrappers.length).toBeGreaterThan(0);
  });
});

describe('CSS safety net', () => {
  const css = readFileSync(
    path.join(process.cwd(), 'src/app/globals.css'),
    'utf8',
  );

  it('defines a [data-motion-fallback] selector', () => {
    expect(css).toMatch(/\[data-motion-fallback\]/);
  });

  it('defines the motion-fallback-reveal keyframe forcing opacity to 1', () => {
    expect(css).toMatch(/@keyframes\s+motion-fallback-reveal/);
    expect(css).toMatch(/motion-fallback-reveal[\s\S]*?opacity:\s*1/);
  });

  it('runs the keyframe with `forwards` so the final state sticks', () => {
    expect(css).toMatch(/\[data-motion-fallback\][^{]*\{[^}]*forwards/);
  });
});
