'use client';

import React from 'react';
import Image from 'next/image';
import * as m from 'motion/react-client';

import { DURATION, EASE } from '@/lib/utils/animation';
import { gradientStyle } from '@/lib/utils/gradient';
import type { TeamMember } from '@/types';

type TeamCardProps = {
  readonly member: TeamMember;
};

/**
 * Tarjeta de miembro del equipo: foto (o gradiente fallback), nombre y rol.
 * Hover translate Y con motion.
 *
 * @kind client
 * @feature marketing-site
 * @example
 * ```tsx
 * <TeamCard member={member} />
 * ```
 */
export function TeamCard({ member }: TeamCardProps): React.ReactElement {
  const grad = gradientStyle(member.gradientC1, member.gradientC2);
  return (
    <m.div
      whileHover={{ y: -4 }}
      transition={{ duration: DURATION.fast, ease: EASE.out }}
      className="rounded-2xl bg-white border border-sp-border overflow-hidden"
    >
      <div className="relative h-56" style={{ background: grad }}>
        {member.photoUrl ? (
          <Image
            src={member.photoUrl}
            alt={member.name}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            className="object-cover object-center"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="font-display text-5xl font-black text-white/80">{member.initials}</span>
          </div>
        )}
      </div>
      <div className="p-4">
        <h3 className="font-display text-lg font-black uppercase text-sp-dark leading-tight">{member.name}</h3>
        <p className="text-xs text-sp-orange font-semibold mt-0.5 mb-2">{member.role}</p>
        <p className="text-xs text-sp-muted leading-relaxed">{member.bio}</p>
      </div>
    </m.div>
  );
}
