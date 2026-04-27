'use client';

import Image from 'next/image';
import type { TalentWithRelations } from '@/types';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { SocialIcon } from '@/components/ui/SocialIcon';
import { gradientStyle } from '@/lib/utils/gradient';

type TalentCardProps = {
  talent: TalentWithRelations;
  onOpen: () => void;
}

/**
 * Card del roster público: foto/gradiente, nombre, badge de status y socials.
 * Renderizada como `<button>` para abrir `TalentModal` desde el grid.
 *
 * @kind client
 * @feature talents-public
 * @example
 * ```tsx
 * <TalentCard talent={talent} onOpen={() => setSelected(talent)} />
 * ```
 */
export function TalentCard({ talent, onOpen }: TalentCardProps) {
  const grad = gradientStyle(talent.gradientC1, talent.gradientC2);

  return (
    <button
      onClick={onOpen}
      className="group text-left w-full rounded-2xl overflow-hidden border border-sp-border bg-white hover:shadow-xl transition-all hover:-translate-y-0.5 focus:outline-none"
    >
      {/* Photo / Gradient fallback */}
      <div className="relative h-52 overflow-hidden" style={{ background: grad }}>
        {talent.photoUrl ? (
          <Image
            src={talent.photoUrl}
            alt={talent.name}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            className="object-cover object-top group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="font-display text-6xl font-black text-white/80">
              {talent.initials}
            </span>
          </div>
        )}
        <StatusBadge status={talent.status} className="absolute top-3 right-3" />
      </div>

      {/* Info */}
      <div className="p-4">
        <h3 className="font-display text-xl font-black uppercase tracking-tight text-sp-dark leading-none">
          {talent.name}
        </h3>
        <p className="text-xs text-sp-muted mt-1 mb-3">{talent.role}</p>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-1 mb-3">
          {talent.stats.slice(0, 3).map((stat) => (
            <div key={stat.id} className="text-center">
              <div className="text-xs font-bold text-sp-dark">{stat.value}</div>
              <div className="text-[10px] text-sp-muted leading-tight">{stat.label.split(' ')[0]}</div>
            </div>
          ))}
        </div>

        {/* Socials */}
        <nav aria-label="Redes sociales" className="flex items-center gap-2">
          {talent.socials.slice(0, 4).map((s) => (
            <a
              key={s.id}
              href={s.profileUrl ?? '#'}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="w-6 h-6 rounded-full flex items-center justify-center hover:scale-110 transition-transform"
              style={{ backgroundColor: `${s.hexColor}20` }}
              aria-label={s.platform}
            >
              <SocialIcon type={s.platform} color={s.hexColor} size={12} />
            </a>
          ))}
        </nav>
      </div>
    </button>
  );
}
