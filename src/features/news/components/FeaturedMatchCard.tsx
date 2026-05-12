import Image from 'next/image';

export type FeaturedMatchMeta = {
  team1?:       string | null;
  team2?:       string | null;
  team1Logo?:   string | null;
  team2Logo?:   string | null;
  tournament?:  string | null;
  matchDate?:   string | null;
  matchTime?:   string | null;
  matchStatus?: 'upcoming' | 'live' | 'finished' | null;
  isActive?:    boolean;
};

type Badge = {
  label: string;
  className: string;
  pulse: boolean;
};

function deriveBadge(meta: FeaturedMatchMeta): Badge | null {
  // Manual override first
  if (meta.matchStatus === 'live') {
    return { label: 'EN VIVO', className: 'bg-red-500/20 text-red-400 border-red-500/30', pulse: true };
  }
  if (meta.matchStatus === 'finished') {
    return { label: 'FINAL', className: 'bg-white/[0.06] text-white/35 border-white/10', pulse: false };
  }

  // Auto-derive from date+time
  if (!meta.matchDate) return null;
  const matchDateTime = new Date(`${meta.matchDate}T${meta.matchTime ?? '23:59'}:00`);
  const now = new Date();
  const diffMs = matchDateTime.getTime() - now.getTime();
  const diffH = diffMs / (1000 * 60 * 60);

  if (diffMs < 0) {
    // Past — treat as live if within last 3h, else finished
    if (diffMs > -3 * 60 * 60 * 1000) {
      return { label: 'EN VIVO', className: 'bg-red-500/20 text-red-400 border-red-500/30', pulse: true };
    }
    return { label: 'FINAL', className: 'bg-white/[0.06] text-white/35 border-white/10', pulse: false };
  }

  // Future — check how close
  const todayStr    = now.toISOString().slice(0, 10);
  const matchDayStr = meta.matchDate;

  if (matchDayStr === todayStr) {
    return { label: 'HOY', className: 'bg-sp-orange/20 text-sp-orange border-sp-orange/30', pulse: false };
  }
  if (diffH < 72) {
    return { label: 'PRÓXIMO', className: 'bg-white/[0.06] text-white/50 border-white/10', pulse: false };
  }
  return null;
}

function formatMatchDate(dateStr?: string | null, timeStr?: string | null): string | null {
  if (!dateStr) return null;
  const d = new Date(`${dateStr}T${timeStr ?? '12:00'}:00`);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
}

function TeamSlot({
  name,
  logo,
}: {
  readonly name: string;
  readonly logo?: string | null;
}) {
  const initials = name.slice(0, 2).toUpperCase();
  return (
    <div className="flex flex-col items-center gap-1.5 flex-1 min-w-0">
      {/* Avatar */}
      <div className="relative w-10 h-10 rounded-xl overflow-hidden shrink-0 bg-white/[0.07] border border-white/10">
        {logo ? (
          <Image
            src={logo}
            alt={name}
            fill
            className="object-contain p-1.5"
            unoptimized
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[11px] font-black text-white/60">
            {initials}
          </div>
        )}
      </div>
      {/* Name */}
      <p className="font-display font-black uppercase text-[10px] tracking-tight text-white/85 text-center leading-none line-clamp-2 w-full">
        {name}
      </p>
    </div>
  );
}

type Props = {
  readonly meta: FeaturedMatchMeta;
};

export function FeaturedMatchCard({ meta }: Props) {
  const badge     = deriveBadge(meta);
  const dateLabel = formatMatchDate(meta.matchDate, meta.matchTime);

  return (
    <div className="rounded-xl overflow-hidden border border-white/[0.08] bg-[#0a0a0a] group hover:border-sp-orange/20 transition-colors duration-300">

      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/[0.06]"
        style={{ background: 'linear-gradient(90deg, rgba(245,99,42,0.08), transparent)' }}>
        <p className="text-[9px] font-black uppercase tracking-[0.28em] text-sp-orange">
          Partido
        </p>
        {badge && (
          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[8px] font-black uppercase tracking-wider ${badge.className}`}>
            {badge.pulse && (
              <span className="w-1 h-1 rounded-full bg-red-500 animate-pulse shrink-0" />
            )}
            {badge.label}
          </span>
        )}
      </div>

      {/* Tournament */}
      {meta.tournament && (
        <div className="px-3 pt-2 pb-0">
          <p className="text-[9px] font-bold uppercase tracking-wider text-white/30 truncate">
            🏆 {meta.tournament}
          </p>
        </div>
      )}

      {/* Teams + VS */}
      <div className="px-3 py-3 flex items-center gap-2">
        <TeamSlot name={meta.team1 ?? ''} logo={meta.team1Logo ?? null} />

        {/* VS */}
        <div className="shrink-0 flex flex-col items-center gap-0.5 px-1">
          <span className="font-display font-black text-[15px] text-white/20 leading-none tracking-widest">
            VS
          </span>
          {meta.matchTime && (
            <span className="text-[11px] font-mono font-bold text-white/70 tabular-nums leading-none">
              {meta.matchTime}
            </span>
          )}
        </div>

        <TeamSlot name={meta.team2 ?? ''} logo={meta.team2Logo ?? null} />
      </div>

      {/* Date footer */}
      {dateLabel && (
        <div className="px-3 pb-2.5 flex items-center justify-center gap-1">
          <span className="text-[9px] font-mono text-white/25 uppercase tracking-wider">
            📅 {dateLabel}
          </span>
        </div>
      )}
    </div>
  );
}
