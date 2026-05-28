'use client';

import Image from 'next/image';
import type { TalentWithRelations } from '@/types';
import { SocialIcon } from '@/components/ui/SocialIcon';
import { gradientStyle } from '@/lib/utils/gradient';
import { countryFlagEmoji } from '@/lib/flag-images';

type TalentCardProps = {
  talent: TalentWithRelations;
  onOpen: () => void;
  priority?: boolean;
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
export function TalentCard({ talent, onOpen, priority = false }: TalentCardProps) {
  const grad = gradientStyle(talent.gradientC1, talent.gradientC2);

  return (
    <button
      onClick={onOpen}
      aria-label={`Ver perfil de ${talent.name}`}
      className="group text-left w-full rounded-2xl overflow-hidden border border-sp-border bg-white hover:shadow-xl transition-all hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-sp-orange focus-visible:ring-offset-2"
    >
      {/* Photo / Gradient fallback */}
      <div className="relative h-52 overflow-hidden" style={{ background: grad }}>
        {talent.photoUrl ? (
          <Image
            src={talent.photoUrl}
            alt={talent.name}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            priority={priority}
            className="object-cover object-top group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="font-display text-6xl font-black text-white/80">
              {talent.initials}
            </span>
          </div>
        )}
        {talent.creatorCountry && (
          <span
            className="absolute bottom-2 right-2 text-xl leading-none drop-shadow-[0_1px_3px_rgba(0,0,0,0.6)]"
            title={talent.creatorCountry}
            aria-label={`País: ${talent.creatorCountry}`}
          >
            {countryFlagEmoji(talent.creatorCountry)}
          </span>
        )}
      </div>

      {/* Info */}
      <div className="p-4">
        <h3 className="font-display text-xl font-black uppercase tracking-tight text-sp-dark leading-none">
          {talent.name}
        </h3>
        <p className="text-xs text-sp-muted mt-1 mb-3">
          {[talent.role, talent.role2].filter(Boolean).join(' · ')}
        </p>

        {/* Stats — from social followers */}
        {talent.socials.length > 0 && (
          <div
            className="grid gap-3 mb-4"
            style={{ gridTemplateColumns: `repeat(${Math.min(talent.socials.length, 3)}, minmax(0, 1fr))` }}
          >
            {talent.socials.slice(0, 3).map((social) => (
              <div key={social.id} className="text-center">
                <div className="text-sm font-bold text-sp-dark">{social.followersDisplay}</div>
                <div className="flex items-center justify-center gap-0.5 text-[10px] text-sp-muted leading-tight mt-0.5">
                  <SocialIcon type={social.platform} size={9} />
                  <span>{social.platform === 'youtube' ? 'Suscriptores' : 'Seguidores'}</span>
                </div>
              </div>
            ))}
          </div>
        )}

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
