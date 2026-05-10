import Link from 'next/link';
import Image from 'next/image';
import type { Cs2SidebarEntry } from '@/lib/queries/live';
import {
  countryFlag,
  countryLabel,
  deriveSceneRole,
  sceneRoleLabel,
  sceneRoleClass,
} from '@/lib/utils/news-roles';

function formatViewers(n: number | null): string {
  if (n == null) return '—';
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}K`;
  return String(n);
}

function streamHref(entry: Cs2SidebarEntry): string {
  if (entry.streamUrl) return entry.streamUrl;
  return `https://twitch.tv/${entry.handle}`;
}

type Props = {
  readonly creators: readonly Cs2SidebarEntry[];
  readonly emptyMessage?: string;
};

export function StreamsLiveGrid({ creators, emptyMessage }: Props) {
  if (creators.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] py-12 text-center">
        <p className="text-sm text-white/55">
          {emptyMessage ?? 'Sin coincidencias en este filtro.'}
        </p>
      </div>
    );
  }

  // Live primero, luego offline. La query ya viene ordenada así.
  const liveCount = creators.filter((c) => c.isLive).length;

  return (
    <div className="space-y-5">
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {creators.map((c) => (
          <StreamCard key={c.slug} creator={c} />
        ))}
      </div>
      <p className="text-[11px] text-white/35 uppercase tracking-wider">
        {liveCount > 0
          ? `${liveCount} en directo · ${creators.length - liveCount} offline`
          : `${creators.length} en el roster`}
      </p>
    </div>
  );
}

function StreamCard({ creator }: { creator: Cs2SidebarEntry }) {
  const role = deriveSceneRole(creator.role, creator.game);
  const isLive = creator.isLive;
  const flag = countryFlag(creator.country);
  const country = countryLabel(creator.country);
  const href = isLive ? streamHref(creator) : `/talentos/${creator.slug}`;
  const target = isLive ? '_blank' : undefined;
  const rel = isLive ? 'noopener noreferrer' : undefined;

  return (
    <article
      className={`group relative bg-[#0c1016] border rounded-2xl overflow-hidden transition-colors ${
        isLive
          ? 'border-emerald-500/30 hover:border-emerald-500/55'
          : 'border-white/[0.07] hover:border-white/15 opacity-90 hover:opacity-100'
      }`}
    >
      <Link
        href={href}
        target={target}
        rel={rel}
        className="absolute inset-0 z-10"
        aria-label={`${creator.name} ${isLive ? 'live' : 'offline'}`}
      >
        <span className="sr-only">{creator.name}</span>
      </Link>

      <div className="relative">
        <div className="relative aspect-[16/10] bg-sp-black overflow-hidden">
          {creator.photoUrl ? (
            <Image
              src={creator.photoUrl}
              alt=""
              fill
              sizes="(min-width:1024px) 380px, (min-width:640px) 50vw, 100vw"
              className="object-cover transition-transform duration-500 group-hover:scale-[1.02]"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-sp-black via-sp-dark to-sp-black flex items-center justify-center font-display font-black text-3xl text-white/30">
              {creator.name.slice(0, 2).toUpperCase()}
            </div>
          )}
          <div
            aria-hidden
            className="absolute inset-x-0 bottom-0 h-2/3 pointer-events-none"
            style={{
              background:
                'linear-gradient(180deg, transparent 0%, rgba(10,11,16,0.55) 50%, rgba(10,11,16,0.95) 100%)',
            }}
          />

          <div className="absolute top-3 left-3 flex items-center gap-2">
            {isLive ? (
              <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider rounded-full px-2.5 py-1 border bg-emerald-500/15 text-emerald-300 border-emerald-500/40 backdrop-blur">
                <span className="relative flex w-1.5 h-1.5">
                  <span className="absolute inset-0 rounded-full bg-emerald-400 motion-safe:animate-ping opacity-60" />
                  <span className="relative w-1.5 h-1.5 rounded-full bg-emerald-400" />
                </span>
                Live
              </span>
            ) : null}
            <span
              className={`inline-flex items-center text-[10px] font-bold uppercase tracking-wider rounded-full px-2 py-0.5 border ${sceneRoleClass(role)}`}
            >
              {sceneRoleLabel(role)}
            </span>
          </div>

          {flag ? (
            <span
              className="absolute top-3 right-3 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-sp-black/80 border border-white/10 rounded-full px-2 py-1 backdrop-blur"
              title={country ?? undefined}
            >
              <span aria-hidden>{flag}</span>
              <span className="text-white/85">{(creator.country ?? '').toUpperCase()}</span>
            </span>
          ) : null}

          {isLive && creator.viewerCount != null ? (
            <div className="absolute bottom-3 right-3 inline-flex items-center gap-1 bg-sp-black/85 border border-emerald-500/30 rounded-full px-2.5 py-1 backdrop-blur">
              <span className="font-display font-black tabular-nums text-emerald-300 text-xs">
                {formatViewers(creator.viewerCount)}
              </span>
              <span className="text-[9px] uppercase tracking-wider text-white/55">
                viewers
              </span>
            </div>
          ) : null}
        </div>

        <div className="relative p-4">
          <h3 className="font-display font-black uppercase text-white text-base leading-tight tracking-tight mb-1.5 group-hover:text-white/95">
            {creator.name}
          </h3>
          {isLive && creator.streamTitle ? (
            <p className="text-xs text-white/60 leading-snug line-clamp-2">
              {creator.streamTitle}
            </p>
          ) : (
            <p className="text-xs text-white/45 leading-snug">
              Twitch · {creator.game}
            </p>
          )}
        </div>
      </div>
    </article>
  );
}
