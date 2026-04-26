'use client';

import * as m from 'motion/react-client';
import { useReducedMotion } from 'motion/react';

import { DURATION, EASE, VIEWPORT } from '@/lib/animation';

type SectionTagProps = {
  readonly children: string;
  readonly className?: string;
};

export function SectionTag({ children, className = '' }: SectionTagProps): React.JSX.Element {
  const reduced = useReducedMotion();
  const cls = `inline-block text-xs font-semibold uppercase tracking-widest text-sp-orange mb-3 ${className}`;

  if (reduced) return <span className={cls}>{children}</span>;

  return (
    <m.span
      initial={{ opacity: 0, y: -8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={VIEWPORT}
      transition={{ duration: DURATION.fast, ease: EASE.out }}
      className={cls}
    >
      {children}
    </m.span>
  );
}
