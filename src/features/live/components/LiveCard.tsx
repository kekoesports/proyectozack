import Image from 'next/image';
import { TrackedCtaLink } from '@/components/ui/TrackedCtaLink';
import type { LiveTalent } from '@/lib/queries/live';

type Props = { talent: LiveTalent };

function formatViewers(n: number | null): string {
  if (!n) return '';
  return n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n);
}

export function LiveCard({ talent }: Props) {
  const streamUrl = talent.streamUrl ?? `https://www.twitch.tv/${talent.handle}`;

  return (
    <TrackedCtaLink
      href={streamUrl}
      ctaId={`live_list_click_${talent.slug}`}
      className="group flex items-center gap-3 p-3 rounded-xl border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.07] transition-colors"
      rel="noopener noreferrer"
      target="_blank"
    >
      {/* Avatar */}
      <div className="relative w-10 h-10 rounded-full overflow-hidden shrink-0 bg-white/10">
        {talent.photoUrl ? (
          <Image src={talent.photoUrl} alt={talent.name} fill className="object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-xs font-black text-white/40">
            {talent.name.slice(0, 2).toUpperCase()}
          </div>
        )}
        {/* Live dot */}
        <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-red-500 border-2 border-sp-black" />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-white truncate">{talent.name}</p>
        <p className="text-xs text-white/40 truncate">{talent.gameName ?? 'Gaming'}</p>
      </div>

      {/* Viewers */}
      {talent.viewerCount != null && talent.viewerCount > 0 && (
        <span className="text-xs font-bold text-red-400 shrink-0">
          {formatViewers(talent.viewerCount)}
        </span>
      )}
    </TrackedCtaLink>
  );
}
