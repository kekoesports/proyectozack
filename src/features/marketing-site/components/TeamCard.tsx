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
 * Parsea el campo name para separar nombre real de nick cuando viene en formato
 * 'Pablo "Kekō" Camacho'. Devuelve { displayName, nick }.
 */
function parseNameNick(raw: string): { displayName: string; nick: string | null } {
  const match = raw.match(/^([^"]+?)\s*"([^"]+)"\s*([^"]*)$/);
  if (!match) return { displayName: raw.trim(), nick: null };
  const first = match[1]?.trim() ?? '';
  const last = match[3]?.trim() ?? '';
  const rawNick = match[2] ?? null;
  // Nicks de gaming: sin diacríticos, sin mayúsculas (kekō → keko)
  const nick = rawNick
    ? rawNick.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
    : null;
  const displayName = [first, last].filter(Boolean).join(' ');
  return { displayName, nick };
}

export function TeamCard({ member }: TeamCardProps): React.ReactElement {
  const grad = gradientStyle(member.gradientC1, member.gradientC2);
  const { displayName, nick } = parseNameNick(member.name);

  return (
    <m.div
      whileHover={{ y: -4 }}
      transition={{ duration: DURATION.fast, ease: EASE.out }}
      className="rounded-2xl bg-white border border-sp-border overflow-hidden"
    >
      {/* Photo area */}
      <div className="relative h-56 overflow-hidden" style={{ background: grad }}>
        {member.photoUrl ? (
          <>
            <Image
              src={member.photoUrl}
              alt={displayName}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
              className="object-cover object-top"
            />
            {/* Subtle overlay: normalizes brightness/temperature across photos
                and reduces prominence of any strong background elements. */}
            <div className="absolute inset-0 bg-sp-black/15 mix-blend-multiply" />
            {/* Bottom fade for smooth transition to card content */}
            <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-black/30 to-transparent" />
          </>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="font-display text-5xl font-black text-white/80">{member.initials}</span>
          </div>
        )}
      </div>

      {/* Card content */}
      <div className="p-4">
        {/* Name — real name as primary element */}
        <h3 className="font-display text-lg font-black uppercase text-sp-dark leading-tight">
          {displayName}
        </h3>

        {/* Nick — secondary, muted, parenthetical */}
        {nick && (
          <p className="text-[11px] text-sp-muted/55 font-medium mt-0.5 mb-1">
            ({nick})
          </p>
        )}

        {/* Role */}
        <p className="text-xs text-sp-orange font-semibold mt-0.5 mb-2">{member.role}</p>

        {/* Bio */}
        <p className="text-xs text-sp-muted leading-relaxed">{member.bio}</p>
      </div>
    </m.div>
  );
}
