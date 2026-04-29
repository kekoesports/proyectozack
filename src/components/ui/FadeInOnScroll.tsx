'use client';
import * as m from 'motion/react-client';
import { useReducedMotion } from 'motion/react';

import { useVisibilityFailSafe } from '@/lib/utils/use-visibility-failsafe';
import { DURATION, EASE, fadeUp } from '@/lib/utils/animation';

import type { ReactNode } from 'react';

type FadeInOnScrollProps = {
  readonly children: ReactNode;
  readonly className?: string;
  readonly delay?: number;
};

/**
 * Fades+slides the subtree in once when scrolled into view. Driven by a
 * fail-safe visibility hook so the content can never be stuck at opacity 0
 * if the IntersectionObserver fails to fire — the original cause of the
 * landing-page "black void" bug.
 */
export function FadeInOnScroll({
  children,
  className = '',
  delay = 0,
}: FadeInOnScrollProps): React.JSX.Element {
  const reduced = useReducedMotion();
  const [ref, visible] = useVisibilityFailSafe<HTMLDivElement>();

  if (reduced) return <div className={className}>{children}</div>;

  return (
    <m.div
      ref={ref}
      data-motion-fallback=""
      initial="hidden"
      animate={visible ? 'visible' : 'hidden'}
      variants={fadeUp}
      transition={{ duration: DURATION.slow, ease: EASE.out, delay }}
      className={className}
    >
      {children}
    </m.div>
  );
}
