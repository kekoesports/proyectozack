'use client';

import React from 'react';

import * as m from 'motion/react-client';

import { DURATION, EASE } from '@/lib/utils/animation';

type AboutCardItem = {
  readonly label: string;
  readonly sub: string;
};

type AboutCardProps = {
  readonly item: AboutCardItem;
};

/**
 * Tarjeta individual del bloque "Sobre SocialPro" con label en gradient y
 * subtítulo. Hover sutil con motion (translate Y).
 *
 * @kind client
 * @feature marketing-site
 * @example
 * ```tsx
 * <AboutCard item={{ label: '13+', sub: 'Años en gaming' }} />
 * ```
 */
export function AboutCard({ item }: AboutCardProps): React.ReactElement {
  return (
    <m.div
      whileHover={{ y: -4 }}
      transition={{ duration: DURATION.fast, ease: EASE.out }}
      className="rounded-2xl bg-sp-off border border-sp-border p-5"
    >
      <div className="font-display text-2xl font-black gradient-text">{item.label}</div>
      <div className="text-xs text-sp-muted mt-1">{item.sub}</div>
    </m.div>
  );
}
