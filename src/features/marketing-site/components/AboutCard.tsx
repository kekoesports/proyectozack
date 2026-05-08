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
  readonly dark?: boolean;
};

export function AboutCard({ item, dark = false }: AboutCardProps): React.ReactElement {
  return (
    <m.div
      whileHover={{ y: -4 }}
      transition={{ duration: DURATION.fast, ease: EASE.out }}
      className={
        dark
          ? 'rounded-2xl bg-sp-dark border border-white/10 p-5 relative overflow-hidden'
          : 'rounded-2xl bg-sp-off border border-sp-border p-5'
      }
    >
      {dark && (
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-sp-orange to-sp-purple" />
      )}
      <div className="font-display text-2xl font-black gradient-text">{item.label}</div>
      <div className={`text-xs mt-1 ${dark ? 'text-white/40' : 'text-sp-muted'}`}>{item.sub}</div>
    </m.div>
  );
}
