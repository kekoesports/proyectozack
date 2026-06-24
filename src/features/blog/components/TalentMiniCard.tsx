import Image from 'next/image';
import Link from 'next/link';
import type { TalentAvatar } from '@/lib/queries/posts';
import { gradientStyle } from '@/lib/utils/gradient';
import { SocialIcon } from '@/components/ui/SocialIcon';

const PLATFORM_COLOR: Record<string, string> = {
  twitch:  '#9146FF',
  youtube: '#FF0000',
};

type Props = { talent: TalentAvatar };

/**
 * Mini card compacta de talent embebida en posts del blog.
 *
 * @kind server
 * @feature blog
 * @example
 * ```tsx
 * <TalentMiniCard talent={talent} />
 * ```
 */
export function TalentMiniCard({ talent }: Props) {
  const grad = gradientStyle(talent.gradientC1, talent.gradientC2);
  const platformColor = PLATFORM_COLOR[talent.platform] ?? '#888';
  const platformKey  = talent.platform === 'youtube' ? 'yt' : 'twitch';

  return (
    <Link
      href={talent.slug ? `/talentos/${talent.slug}` : '/talentos'}
      className="group flex flex-col items-center text-center rounded-2xl border border-sp-border bg-white hover:shadow-lg hover:-translate-y-0.5 transition-all overflow-hidden w-36 flex-shrink-0"
    >
      {/* Photo */}
      <div className="relative w-full h-28 flex-shrink-0" style={{ background: grad }}>
        {talent.photoUrl ? (
          <Image
            src={talent.photoUrl}
            alt={talent.name}
            fill
            sizes="144px"
            className="object-cover object-top group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="font-display text-3xl font-black text-white/80">{talent.initials}</span>
          </div>
        )}
        {/* Platform badge */}
        <div
          className="absolute bottom-2 right-2 w-6 h-6 rounded-full flex items-center justify-center border-2 border-white"
          style={{ backgroundColor: platformColor }}
        >
          <SocialIcon type={platformKey} color="#fff" size={11} />
        </div>
      </div>

      {/* Info */}
      <div className="px-2 py-2.5 w-full">
        <p className="font-display text-xs font-black uppercase text-sp-dark leading-tight truncate">
          {talent.name}
        </p>
        <p className="text-[10px] text-sp-muted mt-0.5 leading-tight line-clamp-2">
          {talent.role}
        </p>
      </div>
    </Link>
  );
}
