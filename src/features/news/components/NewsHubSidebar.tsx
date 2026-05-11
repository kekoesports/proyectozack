import Link from 'next/link';
import type { PostWithTalents } from '@/lib/queries/posts';
import { formatNewsDate } from '@/lib/utils/news';
import { SorteosCtaCard } from './SorteosCtaCard';
import { CodigosCtaCard } from './CodigosCtaCard';

type Props = {
  readonly latestPosts: readonly PostWithTalents[];
};

export function NewsHubSidebar({ latestPosts }: Props) {
  const ultimaHora = latestPosts.slice(0, 5);

  return (
    <aside className="flex flex-col gap-5">
      {/* Última hora */}
      <div className="rounded-2xl bg-white/[0.04] border border-white/[0.07] overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.07]">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-sp-orange animate-pulse" />
            <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-white">Última hora</p>
          </div>
          <Link href="/news" className="text-[10px] text-white/40 hover:text-white/70 transition-colors">
            Ver todas →
          </Link>
        </div>
        <ul className="divide-y divide-white/[0.05]">
          {ultimaHora.length === 0 ? (
            <li className="px-4 py-3 text-xs text-white/40">Sin novedades recientes.</li>
          ) : (
            ultimaHora.map((p) => (
              <li key={p.slug}>
                <Link
                  href={`/news/${p.slug}`}
                  className="flex items-start gap-3 px-4 py-3 hover:bg-white/[0.03] transition-colors group"
                >
                  <span className="text-[10px] text-sp-orange font-mono mt-0.5 shrink-0">
                    {formatNewsDate(p.publishedAt)}
                  </span>
                  <p className="text-xs text-white/80 group-hover:text-white transition-colors line-clamp-2 leading-snug">
                    {p.title}
                  </p>
                </Link>
              </li>
            ))
          )}
        </ul>
      </div>

      {/* Partido destacado — placeholder */}
      <div className="rounded-2xl bg-white/[0.04] border border-white/[0.07] px-4 py-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-white/40 mb-3">Partido destacado</p>
        <p className="text-xs text-white/30 italic">Próximamente</p>
      </div>

      {/* Ranking hispano — placeholder por decisión editorial */}
      <div className="rounded-2xl bg-white/[0.04] border border-white/[0.07] px-4 py-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-white/40 mb-3">Ranking hispano</p>
        <p className="text-xs text-white/30 italic">Próximamente</p>
      </div>

      {/* Sorteos activos */}
      <SorteosCtaCard tone="dark" />

      {/* Códigos exclusivos */}
      <CodigosCtaCard />
    </aside>
  );
}
