import Link from 'next/link';
import Image from 'next/image';
import type { PostWithTalents } from '@/lib/queries/posts';
import type { InferSelectModel } from 'drizzle-orm';
import type { agendaItems } from '@/db/schema';
import { formatNewsDate } from '@/lib/utils/news';

type AgendaItem = InferSelectModel<typeof agendaItems>;

type Props = {
  readonly interview: PostWithTalents | null;
  readonly clip: PostWithTalents | null;
  readonly agenda: readonly AgendaItem[];
};

function formatAgendaTime(dateStr: string, timeStr: string | null) {
  const d = new Date(`${dateStr}T${timeStr ?? '00:00'}`);
  return d.toLocaleDateString('es-ES', { weekday: 'short', day: '2-digit', month: 'short' }) + (timeStr ? ` ${timeStr}` : '');
}

export function NewsHubBottomBlocks({ interview, clip, agenda }: Props) {
  if (!interview && !clip && agenda.length === 0) return null;

  return (
    <section className="bg-sp-black border-t border-white/[0.06] py-14 md:py-20">
      <div className="max-w-7xl mx-auto px-5 md:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

          {/* Entrevista destacada */}
          {interview ? (
            <Link
              href={`/news/${interview.slug}`}
              className="group rounded-2xl bg-white/[0.04] border border-white/[0.07] hover:border-sp-orange/30 overflow-hidden transition-colors"
            >
              {interview.coverUrl && (
                <div className="relative w-full aspect-[16/9] overflow-hidden">
                  <Image
                    src={interview.coverUrl}
                    alt={interview.title}
                    fill
                    className="object-cover group-hover:scale-[1.02] transition-transform duration-500"
                    sizes="(max-width: 768px) 100vw, 33vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-sp-black/80 to-transparent" />
                  <span className="absolute top-3 left-3 text-[10px] font-bold uppercase tracking-[0.28em] bg-sp-orange text-white px-2 py-0.5 rounded">
                    Entrevista
                  </span>
                </div>
              )}
              <div className="p-5">
                <p className="font-display font-black uppercase text-white text-xl tracking-tight leading-tight group-hover:text-sp-orange transition-colors line-clamp-3">
                  {interview.title}
                </p>
                <p className="text-xs text-white/50 mt-2">{formatNewsDate(interview.publishedAt)} · {interview.author}</p>
              </div>
            </Link>
          ) : null}

          {/* Clip destacado */}
          {clip ? (
            <Link
              href={`/news/${clip.slug}`}
              className="group rounded-2xl bg-white/[0.04] border border-white/[0.07] hover:border-sp-pink/30 overflow-hidden transition-colors"
            >
              {clip.coverUrl && (
                <div className="relative w-full aspect-[16/9] overflow-hidden">
                  <Image
                    src={clip.coverUrl}
                    alt={clip.title}
                    fill
                    className="object-cover group-hover:scale-[1.02] transition-transform duration-500"
                    sizes="(max-width: 768px) 100vw, 33vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-sp-black/80 to-transparent" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="w-12 h-12 rounded-full bg-white/15 backdrop-blur flex items-center justify-center group-hover:bg-white/25 transition-colors">
                      <span className="text-white text-lg ml-1">▶</span>
                    </span>
                  </div>
                  <span className="absolute top-3 left-3 text-[10px] font-bold uppercase tracking-[0.28em] bg-sp-pink text-white px-2 py-0.5 rounded">
                    Clip
                  </span>
                </div>
              )}
              <div className="p-5">
                <p className="font-display font-black uppercase text-white text-xl tracking-tight leading-tight group-hover:text-sp-pink transition-colors line-clamp-3">
                  {clip.title}
                </p>
                <p className="text-xs text-white/50 mt-2">{formatNewsDate(clip.publishedAt)} · {clip.author}</p>
              </div>
            </Link>
          ) : null}

          {/* Agenda del día */}
          <div className="rounded-2xl bg-white/[0.04] border border-white/[0.07] overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
              <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-white">Agenda del día</p>
            </div>
            {agenda.length === 0 ? (
              <div className="px-5 py-6">
                <p className="text-xs text-white/25 italic">Sin eventos próximos</p>
              </div>
            ) : (
              <ul className="divide-y divide-white/[0.05]">
                {agenda.map((item) => (
                  <li key={item.id} className="px-5 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        {item.team1 && item.team2 ? (
                          <p className="text-xs font-bold text-white">
                            {item.team1} <span className="text-white/30 font-normal">vs</span> {item.team2}
                          </p>
                        ) : (
                          <p className="text-xs font-bold text-white">{item.title}</p>
                        )}
                        {item.tournament && (
                          <p className="text-[10px] text-white/40 mt-0.5">{item.tournament}</p>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-[10px] text-white/50 font-mono">
                          {formatAgendaTime(item.matchDate, item.matchTime)}
                        </p>
                        {item.isLive && (
                          <span className="text-[9px] font-black text-red-400 bg-red-900/30 px-1.5 py-0.5 rounded-full">LIVE</span>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

        </div>
      </div>
    </section>
  );
}
