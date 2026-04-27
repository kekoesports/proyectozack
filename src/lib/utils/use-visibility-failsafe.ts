'use client';

import { useEffect, useRef, useState } from 'react';
import { useInView, type UseInViewOptions } from 'motion/react';

/**
 * Visibility hook with a hard fail-safe.
 *
 * Returns `[ref, visible]`. `visible` flips to `true` either when the
 * IntersectionObserver reports the element entering the viewport, OR after
 * `failsafeMs` milliseconds — whichever comes first. The fail-safe exists
 * because `whileInView`-style patterns can leave a subtree at `opacity: 0`
 * forever if the observer never fires (slow hydration, lazy chunk, fast
 * scroll past, sub-pixel rounding). That manifested as huge invisible
 * sections on the public landing page.
 *
 * Default: 1.2s — long enough to allow the natural in-view animation in
 * normal conditions, short enough that broken sessions don't stay broken.
 */
export type UseVisibilityFailSafeOptions = {
  readonly amount?: UseInViewOptions['amount'];
  readonly margin?: UseInViewOptions['margin'];
  readonly failsafeMs?: number;
};

const DEFAULT_MARGIN: NonNullable<UseInViewOptions['margin']> = '0px 0px -64px 0px';

export function useVisibilityFailSafe<E extends Element = HTMLDivElement>(
  options: UseVisibilityFailSafeOptions = {},
): readonly [React.RefObject<E | null>, boolean] {
  const { amount = 0, margin = DEFAULT_MARGIN, failsafeMs = 1200 } = options;

  const ref = useRef<E | null>(null);
  // `useInView` from motion/react reads the same observer config we used to
  // pass via the `viewport` prop on `whileInView`. `once: true` means it
  // never flips back to false.
  const inView = useInView(ref, { once: true, amount, margin });
  const [forceVisible, setForceVisible] = useState(false);

  useEffect(() => {
    if (failsafeMs <= 0) return;
    const t = setTimeout(() => setForceVisible(true), failsafeMs);
    return () => clearTimeout(t);
  }, [failsafeMs]);

  return [ref, inView || forceVisible] as const;
}
