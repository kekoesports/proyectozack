import Link from 'next/link';
import type { PostWithTalents } from '@/lib/queries/posts';
import type { Cs2SidebarEntry } from '@/lib/queries/live';
import { deriveNewsCategory } from '@/lib/utils/news';
import { Cs2CreatorsAside } from './Cs2CreatorsAside';
import { SorteosCtaCard } from './SorteosCtaCard';

type Tone = 'dark' | 'paper';

type Props = {
  readonly posts: readonly PostWithTalents[];
  readonly cs2Creators: readonly Cs2SidebarEntry[];
  readonly tone?: Tone;
};

const TRENDING_TAGS = [
  'CS2',
  'ESEA Advanced',
  'Tier 2 EU',
  'Roster moves',
  'Mapas',
  'Spain',
  'LATAM',
  'Twitch',
  'YouTube',
];

export function NewsAside({ posts, cs2Creators, tone = 'dark' }: Props) {
  const editor = posts.slice(0, 3);
  const cardClass =
    tone === 'paper'
      ? 'bg-sp-black border border-black/[0.06] shadow-[0_2px_8px_rgba(0,0,0,0.05)] rounded-2xl p-5'
      : 'bg-[#0c1016] border border-white/[0.06] rounded-2xl p-5';

  return (
    <aside className="space-y-6 lg:space-y-7">
      <SorteosCtaCard tone={tone} />
      <Cs2CreatorsAside creators={cs2Creators} tone={tone} />

      {editor.length > 0 ? (
        <section className={cardClass}>
          <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-sp-orange mb-4">
            From the editor
          </p>
          <ul className="space-y-3.5">
            {editor.map((p, i) => {
              const cat = deriveNewsCategory(p.slug, p.title);
              return (
                <li key={p.slug}>
                  <Link
                    href={`/news/${p.slug}`}
                    className="group flex gap-3"
                  >
                    <span className="flex-none font-display font-black text-2xl tabular-nums leading-none text-white/15 group-hover:text-white/25 transition-colors w-6">
                      0{i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <span className={`inline-block text-[9px] font-bold uppercase tracking-[0.18em] mb-1 ${cat.text}`}>
                        {cat.label}
                      </span>
                      <h4 className="font-display font-black uppercase text-white text-sm leading-[1.15] tracking-tight line-clamp-2 group-hover:text-white/95">
                        {p.title}
                      </h4>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      <section className={cardClass}>
        <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-sp-orange mb-4">
          Trending tags
        </p>
        <ul className="flex flex-wrap gap-2">
          {TRENDING_TAGS.map((t) => (
            <li key={t}>
              <span className="inline-block px-2.5 py-1 rounded-full border border-white/10 bg-white/[0.03] text-[11px] text-white/65 hover:bg-white/[0.06] hover:text-white/90 transition-colors">
                #{t}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </aside>
  );
}
