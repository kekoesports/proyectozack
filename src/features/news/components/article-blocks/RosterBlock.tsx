import Link from 'next/link';
import { countryFlag } from '@/lib/utils/news-roles';
import type { Roster, RosterMember } from './types';

type Props = { readonly roster: Roster };

export function RosterBlock({ roster }: Props) {
  const starters = roster.players.filter((p) => p.status === 'starter');
  const bench = roster.players.filter((p) => p.status === 'benched');

  return (
    <section className="relative max-w-3xl mx-auto px-5 md:px-8 mt-10 md:mt-14">
      <div className="bg-sp-black border border-white/[0.08] rounded-2xl overflow-hidden">
        <header className="px-5 md:px-7 pt-5 pb-4 border-b border-white/[0.05]">
          <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-sp-orange leading-none mb-2">
            Roster
          </p>
          <h2 className="font-display text-xl md:text-2xl font-black uppercase tracking-tight leading-[1.0] text-white">
            {roster.teamName}
          </h2>
        </header>

        <ul className="divide-y divide-white/[0.05]">
          {roster.coach ? (
            <PlayerRow
              member={{ ...roster.coach, status: 'starter', role: 'Coach' }}
              isCoach
            />
          ) : null}
          {starters.map((p) => (
            <PlayerRow key={p.nick} member={p} />
          ))}
          {bench.map((p) => (
            <PlayerRow key={p.nick} member={p} />
          ))}
        </ul>
      </div>
    </section>
  );
}

function PlayerRow({ member, isCoach }: { member: RosterMember; isCoach?: boolean }) {
  const flag = countryFlag(member.country);
  const isBenched = member.status === 'benched';
  const isSocialPro = !!member.talentSlug;

  const Inner = (
    <div className={`group flex items-center gap-3 md:gap-4 px-5 md:px-7 py-3.5 transition-colors ${isSocialPro ? 'hover:bg-sp-orange/[0.04]' : 'hover:bg-white/[0.025]'} ${isBenched ? 'opacity-70' : ''}`}>
      <span aria-hidden className="flex-none text-xl md:text-2xl leading-none">
        {flag ?? '🏳️'}
      </span>
      <div className="flex-1 min-w-0 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className={`font-display font-black uppercase tracking-tight text-base md:text-lg leading-none ${isSocialPro ? 'text-sp-orange' : 'text-white'} truncate`}>
          {member.nick}
        </span>
        {member.realName ? (
          <span className="text-xs text-white/40 truncate">{member.realName}</span>
        ) : null}
        {isSocialPro ? (
          <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-[0.22em] text-sp-orange/85 border border-sp-orange/30 bg-sp-orange/[0.06] rounded-full px-2 py-0.5 leading-none">
            SocialPro
          </span>
        ) : null}
      </div>
      <span className="flex-none text-[10px] font-bold uppercase tracking-[0.18em] text-white/45 leading-none">
        {isCoach ? 'Coach' : member.role ?? (isBenched ? 'Banco' : 'Starter')}
      </span>
      {isSocialPro && member.talentSlug ? (
        <span aria-hidden className="flex-none text-white/30 group-hover:text-sp-orange transition-colors">→</span>
      ) : null}
    </div>
  );

  if (isSocialPro && member.talentSlug) {
    return (
      <li>
        <Link href={`/talentos/${member.talentSlug}`} className="block">
          {Inner}
        </Link>
      </li>
    );
  }
  return <li>{Inner}</li>;
}
