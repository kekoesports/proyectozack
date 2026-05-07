'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { trackEvent } from '@/lib/analytics';

type Props = {
  readonly href: string;
  readonly ctaId: string;
  readonly className?: string;
  readonly children: ReactNode;
  readonly target?: string;
  readonly rel?: string;
};

/**
 * `<Link>` con tracking de `cta_click` automático en click.
 * Útil para Server Components que no pueden usar `onClick` directo.
 *
 * @kind client
 * @feature ui
 */
export function TrackedCtaLink({ href, ctaId, className, children, target, rel }: Props): React.JSX.Element {
  return (
    <Link
      href={href}
      onClick={() => trackEvent('cta_click', { cta_id: ctaId, cta_destination: href })}
      {...(className ? { className } : {})}
      {...(target ? { target } : {})}
      {...(rel ? { rel } : {})}
    >
      {children}
    </Link>
  );
}
