'use client';
import * as m from 'motion/react-client';
import { useReducedMotion } from 'motion/react';

import { DURATION, EASE, VIEWPORT, fadeUp } from '@/lib/animation';

import type { ReactNode } from 'react';

type FadeInOnScrollProps = {
  readonly children: ReactNode;
  readonly className?: string;
  readonly delay?: number;
};

export function FadeInOnScroll({ children, className = '', delay = 0 }: FadeInOnScrollProps): React.JSX.Element {
  const reduced = useReducedMotion();
  if (reduced) return <div className={className}>{children}</div>;
  return (
    <m.div
      initial="hidden"
      whileInView="visible"
      viewport={VIEWPORT}
      variants={fadeUp}
      transition={{ duration: DURATION.slow, ease: EASE.out, delay }}
      className={className}
    >
      {children}
    </m.div>
  );
}
