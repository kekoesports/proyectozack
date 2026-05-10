import Link from 'next/link';
import Image from 'next/image';
import type { PostWithTalents } from '@/lib/queries/posts';
import type { TalentAvatar } from '@/lib/queries/posts';
import { deriveNewsCategory } from '@/lib/utils/news';
import { Cs2LabCard } from '@/components/cs2-lab/Cs2LabCard';

type Props = {
  readonly posts: readonly PostWithTalents[];
  readonly creatorSpotlight?: TalentAvatar | null;
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

export function NewsAside({ posts, creatorSpotlight }: Props) {
  const editor = posts.slice(0, 3);

  return (
    <aside className="space-y-6 lg:space-y-7">
      {creatorSpotlight ? (
        <section className="bg-[#0c1016] border border-white/[0.06] rounded-2xl overflow-hidden">
          <div className="px-5 pt-5 flex items-center justify-between">
            <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-sp-orange">
              Creator spotlight
            </p>
            <Link
              href="/talentos"
              className="text-[10px] uppercase tracking-wider text-white/45 hover:text-white/85 transition-colors"
            >
              Ver roster →
            </Link>
          </div>
          <Link
            href={`/talentos/${creatorSpotlight.slug}`}
            className="group flex items-center gap-4 p-5"
          >
            <div className="relative flex-none w-16 h-16 rounded-2xl overflow-hidden bg-sp-black ring-1 ring-white/10">
              {creatorSpotlight.photoUrl ? (
                <Image
                  src={creatorSpotlight.photoUrl}
                  alt={creatorSpotlight.name}
                  fill
                  sizes="64px"
                  className="object-cover"
                />
              ) : (
                <div
                  className="absolute inset-0 flex items-center justify-center font-display font-black text-white text-lg"
                  style={{
                    background: `linear-gradient(135deg, ${creatorSpotlight.gradientC1}, ${creatorSpotlight.gradientC2})`,
                  }}
                >
                  {creatorSpotlight.initials}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-display font-black text-white text-base leading-none mb-1.5 group-hover:text-white/95 truncate">
                {creatorSpotlight.name}
              </div>
              <div className="text-[11px] uppercase tracking-wider text-white/45 truncate">
                {creatorSpotlight.role} · {creatorSpotlight.platform}
              </div>
            </div>
            <span
              aria-hidden
              className="flex-none text-white/40 group-hover:text-white/85 group-hover:translate-x-0.5 transition-all"
            >
              →
            </span>
          </Link>
        </section>
      ) : null}

      <Cs2LabCard variant="compact" ctaId="news_aside_apuesta_segura_cs2" />

      {editor.length > 0 ? (
        <section className="bg-[#0c1016] border border-white/[0.06] rounded-2xl p-5">
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

      <section className="bg-[#0c1016] border border-white/[0.06] rounded-2xl p-5">
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
