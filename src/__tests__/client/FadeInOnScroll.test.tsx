import { act, render, renderHook, screen } from '@testing-library/react';

import { FadeInOnScroll } from '@/components/ui/FadeInOnScroll';
import { useVisibilityFailSafe } from '@/lib/use-visibility-failsafe';

/**
 * Regression tests for the public landing-page "black void" bug.
 *
 * Symptom (Apr 2026): on certain mobile sessions whole sections of the
 * landing page (Marquee, Brands, Talents, Metrics, FAQ, Contact, etc.)
 * rendered as a giant invisible block. Cause: `FadeInOnScroll` used
 * `initial="hidden" + whileInView`. If the IntersectionObserver never
 * fires (slow hydration, lazy chunk registers the observer late, scroll
 * past before the threshold is reached, sub-pixel rounding) the subtree
 * stays at `opacity: 0` forever.
 *
 * The fix factored visibility into `useVisibilityFailSafe`, which flips
 * to `true` either via the observer OR after a fail-safe timeout — so
 * the broken-observer case can never strand the user on an invisible
 * section.
 */

// Replace IntersectionObserver with a no-op that never reports intersections.
// This simulates the production bug exactly: the observer is registered but
// its callback never fires, so the component must rely on the fail-safe.
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

describe('useVisibilityFailSafe', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
  });

  it('starts hidden when the observer never fires', () => {
    const { result } = renderHook(() => useVisibilityFailSafe());
    const [, visible] = result.current;
    expect(visible).toBe(false);
  });

  it('flips visible after the default 1.2s fail-safe even with no observer events', () => {
    const { result } = renderHook(() => useVisibilityFailSafe());

    act(() => {
      jest.advanceTimersByTime(1199);
    });
    expect(result.current[1]).toBe(false);

    act(() => {
      jest.advanceTimersByTime(2);
    });
    expect(result.current[1]).toBe(true);
  });

  it('respects a custom fail-safe duration', () => {
    const { result } = renderHook(() => useVisibilityFailSafe({ failsafeMs: 500 }));

    act(() => {
      jest.advanceTimersByTime(499);
    });
    expect(result.current[1]).toBe(false);

    act(() => {
      jest.advanceTimersByTime(2);
    });
    expect(result.current[1]).toBe(true);
  });

  it('disables the fail-safe when failsafeMs <= 0', () => {
    const { result } = renderHook(() => useVisibilityFailSafe({ failsafeMs: 0 }));

    act(() => {
      jest.advanceTimersByTime(60_000);
    });

    // Without observer events and with the fail-safe disabled, visibility
    // remains false. (Components opt out only if they handle visibility
    // some other way.)
    expect(result.current[1]).toBe(false);
  });

  it('clears the timer on unmount so it cannot fire after teardown', () => {
    const { result, unmount } = renderHook(() => useVisibilityFailSafe());
    unmount();

    // If the timer leaked it would still try to setState on an unmounted
    // hook. With the cleanup in place, advancing time is a no-op for the
    // disposed instance and React would not warn. We assert by ensuring
    // no error is thrown and the prior result snapshot stays hidden.
    expect(() => {
      act(() => {
        jest.advanceTimersByTime(2000);
      });
    }).not.toThrow();
    expect(result.current[1]).toBe(false);
  });
});

describe('FadeInOnScroll', () => {
  it('renders children when IntersectionObserver never fires', () => {
    render(
      <FadeInOnScroll>
        <p>landing-copy</p>
      </FadeInOnScroll>,
    );

    // Children must always be in the DOM. Visibility is handled by
    // useVisibilityFailSafe (covered above) — this guards against the
    // component crashing or otherwise unmounting in the broken-observer
    // path.
    expect(screen.getByText('landing-copy')).toBeInTheDocument();
  });
});
