import Link from 'next/link';
import Image from 'next/image';
import { TrackedCtaLink } from '@/components/ui/TrackedCtaLink';
import type { Cs2SidebarEntry } from '@/lib/queries/live';

const TELEGRAM_URL = 'https://t.me/+B65oaDw_4jhmNDFk';
const MAX_VISIBLE = 6;

function formatViewers(n: number | null): string {
  if (n == null) return '';
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}K`;
  return String(n);
}

function streamHref(entry: Cs2SidebarEntry): string {
  if (entry.streamUrl) return entry.streamUrl;
  return `https://twitch.tv/${entry.handle}`;
}

function profileHref(entry: Cs2SidebarEntry): string {
  return `/talentos/${entry.slug}`;
}

type Props = {
  readonly creators: readonly Cs2SidebarEntry[];
};

export function Cs2CreatorsAside({ creators }: Props) {
  const visible = creators.slice(0, MAX_VISIBLE);
  const liveCount = creators.filter((c) => c.isLive).length;

  if (visible.length === 0) return null;

  return (
    <section className="bg-[#0c1016] border border-white/[0.06] rounded-2xl overflow-hidden">
      <header className="flex items-center justify-between px-5 pt-5 pb-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-sp-orange leading-none">
            Roster CS2 SocialPro
          </p>
          <p className="text-[11px] text-white/40 mt-1.5 leading-none">
            {liveCount > 0 ? (
              <>
                <span className="text-emerald-400 font-bold">{liveCount} en directo</span>
                {' · '}
                <span>{visible.length - liveCount} offline</span>
              </>
            ) : (
              <>Ahora mismo offline</>
            )}
          </p>
        </div>
      </header>

      <ul className="divide-y divide-white/[0.04]">
        {visible.map((c) => {
          const isLive = c.isLive;
          const href = isLive ? streamHref(c) : profileHref(c);
          const target = isLive ? '_blank' : undefined;
          const rel = isLive ? 'noopener noreferrer' : undefined;
          return (
            <li key={c.slug}>
              <Link
                href={href}
                target={target}
                rel={rel}
                className={`group flex items-center gap-3 px-5 py-3 hover:bg-white/[0.025] transition-colors ${
                  isLive ? '' : 'opacity-80 hover:opacity-100'
                }`}
              >
                <div className="relative flex-none w-10 h-10 rounded-full overflow-hidden bg-sp-black ring-1 ring-white/10">
                  {c.photoUrl ? (
                    <Image
                      src={c.photoUrl}
                      alt=""
                      fill
                      sizes="40px"
                      className="object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center font-display font-black text-white/60 text-xs">
                      {c.name.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  {isLive ? (
                    <span
                      aria-hidden
                      className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 ring-2 ring-[#0c1016]"
                    />
                  ) : null}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={`font-display font-black text-sm leading-none truncate ${
                        isLive ? 'text-white' : 'text-white/75'
                      } group-hover:text-white`}
                    >
                      {c.name}
                    </span>
                    {isLive ? (
                      <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-emerald-300 bg-emerald-500/12 border border-emerald-500/30 rounded px-1.5 py-0.5 leading-none">
                        Live
                      </span>
                    ) : null}
                  </div>
                  <div className="text-[11px] text-white/40 truncate mt-1 leading-tight">
                    {isLive && c.streamTitle ? (
                      <>{c.streamTitle}</>
                    ) : (
                      <>Twitch · {c.game}</>
                    )}
                  </div>
                </div>
                {isLive && c.viewerCount != null ? (
                  <div className="flex-none text-right">
                    <div className="font-display font-black text-sm tabular-nums text-emerald-300 leading-none">
                      {formatViewers(c.viewerCount)}
                    </div>
                    <div className="text-[9px] uppercase tracking-wider text-white/35 mt-1">
                      viewers
                    </div>
                  </div>
                ) : (
                  <span aria-hidden className="text-white/30 group-hover:text-white/60 transition-colors">
                    →
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>

      <div className="px-5 py-3 border-t border-white/[0.04] bg-white/[0.015]">
        <Link
          href="/talentos"
          className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-white/55 hover:text-white transition-colors"
        >
          Ver roster CS2 completo
          <span aria-hidden>→</span>
        </Link>
      </div>

      <div className="px-5 py-3 border-t border-white/[0.04] flex items-center gap-3">
        <Image
          src="/images/apuesta-segura-cs2/badge.png"
          alt=""
          width={28}
          height={28}
          className="flex-none w-7 h-7 rounded-full ring-1 ring-white/10 object-cover"
        />
        <div className="flex-1 min-w-0">
          <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-sp-orange leading-none">
            Apuesta Segura CS2
          </div>
          <div className="text-[10px] text-white/45 mt-1 leading-none">
            Análisis competitivo · Telegram gratuito
          </div>
        </div>
        <TrackedCtaLink
          href={TELEGRAM_URL}
          ctaId="news_aside_cs2_roster_telegram"
          target="_blank"
          rel="noopener noreferrer"
          className="flex-none text-[10px] font-bold uppercase tracking-wider text-white/85 hover:text-white border border-white/15 hover:border-white/30 rounded-full px-2.5 py-1 transition-colors"
        >
          Canal →
        </TrackedCtaLink>
      </div>
    </section>
  );
}
