import Link from 'next/link';
import { countryFlag } from '@/lib/utils/news-roles';
import type { Roster, RosterMember } from './types';

const AVATAR_GRADIENTS = [
  'from-sp-orange via-sp-pink to-sp-dpink',
  'from-sp-purple via-sp-pink to-sp-orange',
  'from-sp-blue via-sp-purple to-sp-dpink',
  'from-sp-pink via-sp-dpink to-sp-purple',
  'from-sp-orange via-sp-dpink to-sp-purple',
  'from-sp-blue via-sp-purple to-sp-pink',
] as const;

function avatarGradient(seed: string): string {
  const hash = [...seed].reduce((h, c) => ((h << 5) - h) + c.charCodeAt(0), 0);
  return AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length] ?? AVATAR_GRADIENTS[0];
}

type Props = { readonly roster: Roster };

export function RosterBlock({ roster }: Props) {
  const starters = roster.players.filter((p) => p.status === 'starter');
  const bench = roster.players.filter((p) => p.status === 'benched');

  return (
    <section className="max-w-5xl mx-auto px-5 md:px-8 my-14 md:my-20">
      <header className="mb-6 md:mb-8 flex items-baseline justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-sp-orange leading-none mb-2">
            Roster
          </p>
          <h2 className="font-display text-2xl md:text-3xl font-black uppercase tracking-tight leading-[1.0] text-white">
            {roster.teamName}
          </h2>
        </div>
        {roster.coach ? (
          <CoachBadge coach={roster.coach} />
        ) : null}
      </header>

      <ul className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
        {starters.map((p) => (
          <PlayerCard key={p.nick} member={p} />
        ))}
        {bench.map((p) => (
          <PlayerCard key={p.nick} member={p} />
        ))}
      </ul>
    </section>
  );
}

function CoachBadge({ coach }: { coach: NonNullable<Roster['coach']> }) {
  const flag = countryFlag(coach.country);
  return (
    <div className="flex-none flex items-center gap-2.5 bg-sp-black border border-white/[0.08] rounded-full pl-2.5 pr-4 py-1.5">
      <span aria-hidden className="flex-none w-7 h-7 rounded-full bg-gradient-to-br from-white/15 to-white/[0.04] flex items-center justify-center text-base leading-none">
        {flag ?? '🏳️'}
      </span>
      <div className="flex flex-col leading-tight">
        <span className="text-[9px] font-bold uppercase tracking-[0.22em] text-white/45 leading-none">Coach</span>
        <span className="font-display font-black text-sm text-white tracking-tight leading-none mt-1">{coach.nick}</span>
      </div>
    </div>
  );
}

function PlayerCard({ member }: { member: RosterMember }) {
  const flag = countryFlag(member.country);
  const isBenched = member.status === 'benched';
  const isSocialPro = !!member.talentSlug;
  const grad = avatarGradient(member.nick);

  const Card = (
    <article
      className={`group relative bg-[#0c1016] rounded-2xl overflow-hidden border transition-all duration-300 ${
        isSocialPro
          ? 'border-sp-orange/30 hover:border-sp-orange/55 shadow-[0_0_30px_rgba(245,99,42,0.06)] hover:shadow-[0_0_40px_rgba(245,99,42,0.12)] hover:-translate-y-0.5'
          : 'border-white/[0.06] hover:border-white/15 hover:-translate-y-0.5'
      } ${isBenched ? 'opacity-75' : ''}`}
    >
      <div className="relative px-4 md:px-5 pt-5 pb-4 flex flex-col items-center text-center">
        <div className="relative mb-3">
          <span
            aria-hidden
            className={`flex-none w-16 h-16 md:w-[72px] md:h-[72px] rounded-full bg-gradient-to-br ${grad} flex items-center justify-center font-display font-black text-xl md:text-2xl text-white/95 uppercase tracking-tight`}
          >
            {member.nick.slice(0, 2)}
          </span>
          <span
            aria-hidden
            className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-sp-black border-2 border-sp-black flex items-center justify-center text-lg leading-none"
          >
            {flag ?? '🏳️'}
          </span>
        </div>

        <div className="flex items-center gap-2 mb-1">
          <h3
            className={`font-display font-black uppercase text-base md:text-lg tracking-tight leading-none truncate ${isSocialPro ? 'text-sp-orange' : 'text-white'}`}
          >
            {member.nick}
          </h3>
        </div>

        {member.realName ? (
          <p className="text-[11px] text-white/45 leading-none truncate w-full">{member.realName}</p>
        ) : null}

        <div className="mt-3 flex items-center gap-2 flex-wrap justify-center">
          {member.role ? (
            <span className="inline-flex items-center text-[9px] font-bold uppercase tracking-[0.22em] text-white/55 border border-white/10 rounded-full px-2 py-0.5 leading-none">
              {member.role}
            </span>
          ) : null}
          <span
            className={`inline-flex items-center text-[9px] font-bold uppercase tracking-[0.22em] rounded-full px-2 py-0.5 leading-none border ${
              isBenched
                ? 'text-white/45 bg-white/[0.04] border-white/15'
                : 'text-emerald-300 bg-emerald-500/10 border-emerald-500/25'
            }`}
          >
            {isBenched ? 'Banco' : 'Starter'}
          </span>
          {isSocialPro ? (
            <span className="inline-flex items-center text-[9px] font-bold uppercase tracking-[0.22em] text-sp-orange/95 bg-sp-orange/[0.08] border border-sp-orange/30 rounded-full px-2 py-0.5 leading-none">
              SocialPro
            </span>
          ) : null}
        </div>
      </div>
    </article>
  );

  if (isSocialPro && member.talentSlug) {
    return (
      <li>
        <Link href={`/talentos/${member.talentSlug}`} className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-sp-orange/40 rounded-2xl">
          {Card}
        </Link>
      </li>
    );
  }
  return <li>{Card}</li>;
}
