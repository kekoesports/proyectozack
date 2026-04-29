'use client';

import * as m from 'motion/react-client';
import { useReducedMotion } from 'motion/react';

import { DURATION, EASE } from '@/lib/utils/animation';
import { useVisibilityFailSafe } from '@/lib/utils/use-visibility-failsafe';

type SectionTagProps = {
  readonly children: string;
  readonly className?: string;
};

/**
 * Etiqueta de sección (eyebrow) en uppercase + naranja de marca, con
 * animación `whileInView` que respeta `prefers-reduced-motion`.
 *
 * @kind client
 * @feature ui
 * @example
 * ```tsx
 * <SectionTag>Servicios</SectionTag>
 * ```
 */
export function SectionTag({ children, className = '' }: SectionTagProps): React.JSX.Element {
  const reduced = useReducedMotion();
  const [ref, visible] = useVisibilityFailSafe<HTMLSpanElement>();
  const cls = `inline-block text-xs font-semibold uppercase tracking-widest text-sp-orange mb-3 ${className}`;

  if (reduced) return <span className={cls}>{children}</span>;

  return (
    <m.span
      ref={ref}
      data-motion-fallback=""
      initial={{ opacity: 0, y: -8 }}
      animate={visible ? { opacity: 1, y: 0 } : { opacity: 0, y: -8 }}
      transition={{ duration: DURATION.fast, ease: EASE.out }}
      className={cls}
    >
      {children}
    </m.span>
  );
}
