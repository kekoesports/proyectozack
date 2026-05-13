import Link from 'next/link';
import Image from 'next/image';
import type { PostWithTalents } from '@/lib/queries/posts';
import type { InferSelectModel } from 'drizzle-orm';
import type { agendaItems, rankingEntries } from '@/db/schema';
import { formatNewsDate } from '@/lib/utils/news';
import type { FeaturedMatchMeta } from './FeaturedMatchCard';

type AgendaItem = InferSelectModel<typeof agendaItems>;
type RankingEntry = InferSelectModel<typeof rankingEntries>;

type YoutubePost = { id: number; slug: string; title: string; excerpt: string; coverUrl: string | null; publishedAt: Date | null; youtubeUrl: string };

type Props = {
  readonly interview: PostWithTalents | null;
  readonly clip: PostWithTalents | null;
  readonly featuredMatch: FeaturedMatchMeta | null;
  readonly agenda: readonly AgendaItem[];
  readonly ranking: readonly RankingEntry[];
  readonly youtubePosts: readonly YoutubePost[];
  readonly topPosts: readonly PostWithTalents[];
};

function SectionHeader({ label, title }: { label: string; title: string }) {
  return (
    <div className="mb-6">
      <p className="text-[9px] font-bold uppercase tracking-[0.32em] text-sp-orange mb-1">{label}</p>
      <h2 className="font-display text-xl md:text-2xl font-black uppercase text-white tracking-tight leading-tight">{title}</h2>
    </div>
  );
}

function AgendaWidget({ items }: { items: readonly AgendaItem[] }) {
  if (items.length === 0) return null;
  return (
    <div className="rounded-2xl bg-white/[0.04] border border-white/[0.07] overflow-hidden">
      <div className="px-5 py-4 border-b border-white/[0.06] flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-sp-orange shrink-0" />
        <p className="text-[9px] font-black uppercase tracking-[0.3em] text-white">Agenda del día</p>
      </div>
      <ul className="divide-y divide-white/[0.04]">
        {items.map((item) => {
          const date = new Date(`${item.matchDate}T${item.matchTime ?? '00:00'}`);
          const timeStr = item.matchTime ?? '';
          return (
            <li key={item.id} className="flex items-center gap-4 px-5 py-3.5">
              <div className="shrink-0 text-center min-w-[48px]">
                <p className="font-mono font-bold text-white text-sm">{timeStr || '—'}</p>
                <p className="text-[9px] text-white/30 uppercase">{date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}</p>
              </div>
              <div className="flex-1 min-w-0">
                {item.team1 && item.team2 ? (
                  <p className="text-sm font-bold text-white">
                    <span>{item.team1}</span>
                    <span className="text-white/30 mx-1.5 font-normal">vs</span>
                    <span>{item.team2}</span>
                  </p>
                ) : (
                  <p className="text-sm font-bold text-white">{item.title}</p>
                )}
                {item.tournament && <p className="text-[10px] text-white/35 mt-0.5">{item.tournament}</p>}
              </div>
              {item.isLive && (
                <span className="shrink-0 text-[8px] font-black text-red-400 bg-red-900/25 border border-red-500/20 px-2 py-0.5 rounded-full">LIVE</span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}



function FeaturedPostCard({ post, label }: { post: PostWithTalents; label?: string }) {
  const date = formatNewsDate(post.publishedAt);
  return (
    <article className="relative group rounded-2xl overflow-hidden h-[220px] md:h-[260px] hover:ring-1 hover:ring-white/15 transition-all">
      <Link href={`/news/${post.slug}`} className="absolute inset-0 z-10" aria-label={post.title} />
      {post.coverUrl && (
        <Image src={post.coverUrl} alt="" fill sizes="(min-width:1024px) 45vw, 100vw"
          className="object-cover brightness-[0.65] transition-transform duration-500 group-hover:scale-[1.03]" />
      )}
      <div aria-hidden className="absolute inset-0 pointer-events-none"
        style={{ background: 'linear-gradient(180deg,rgba(0,0,0,0.05) 0%,rgba(0,0,0,0.78) 60%,rgba(0,0,0,0.97) 100%)' }} />
      {label && (
        <div className="absolute top-3 left-3 z-10">
          <span className="text-[8px] font-black uppercase tracking-wider text-sp-orange bg-sp-orange/10 border border-sp-orange/20 px-2 py-0.5 rounded-full">{label}</span>
        </div>
      )}
      <div className="absolute bottom-0 left-0 right-0 p-5 z-10">
        <h3 className="font-display font-black uppercase text-white text-lg md:text-xl tracking-tight leading-[1.0] line-clamp-2 mb-2">{post.title}</h3>
        <p className="text-[11px] text-white/50 line-clamp-1">{post.author} · {date}</p>
      </div>
    </article>
  );
}


type StaticYoutubeClip = { title: string; creator: string; youtubeUrl: string };

// Clips fijos de creadores — no requieren artículo, apuntan directo a YouTube
const STATIC_YOUTUBE_CLIPS: StaticYoutubeClip[] = [
  {
    title: '9z Huasopeek: los mejores momentos en PGL Astana 2026',
    creator: '9z Team',
    youtubeUrl: 'https://www.youtube.com/watch?v=YWKbt0vKgwE',
  },
  {
    title: 'Huasopeek al límite: el clip que resume su nivel en CS2',
    creator: '9z Team',
    youtubeUrl: 'https://www.youtube.com/watch?v=uZMALHPMpo8',
  },
];

function YouTubeCard({ clip }: { clip: StaticYoutubeClip }) {
  const videoId = clip.youtubeUrl.match(/(?:v=|youtu\.be\/)([^&?/]+)/)?.[1] ?? '';
  const thumb = videoId ? `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg` : '';

  return (
    <article className="group rounded-xl overflow-hidden bg-[#0c1016] border border-white/[0.07] hover:border-white/[0.15] transition-all">
      <a href={clip.youtubeUrl} target="_blank" rel="noopener noreferrer" className="block">
        <div className="relative aspect-video overflow-hidden">
          {thumb && (
            <Image src={thumb} alt={clip.title} fill sizes="(min-width:1024px) 30vw, 100vw"
              className="object-cover transition-transform duration-500 group-hover:scale-[1.04]" />
          )}
          <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 transition-colors" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-red-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
              <svg viewBox="0 0 24 24" fill="white" className="w-5 h-5 ml-0.5">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          </div>
          <div className="absolute top-2 left-2">
            <span className="text-[8px] font-black uppercase tracking-wider bg-red-600 text-white px-2 py-0.5 rounded">YouTube</span>
          </div>
        </div>
        <div className="p-4">
          <p className="text-[9px] text-white/35 uppercase tracking-wider mb-1">{clip.creator}</p>
          <h3 className="font-display font-black uppercase text-white text-[14px] tracking-tight leading-[1.1] line-clamp-2 group-hover:text-sp-orange transition-colors">
            {clip.title}
          </h3>
        </div>
      </a>
    </article>
  );
}

export function NewsHubEditorialZone({ interview, clip, featuredMatch, agenda, ranking: _ranking }: Props) {
  const _hasMatch = !!(featuredMatch?.team1 && featuredMatch?.team2);
  const hasAgenda = agenda.length > 0;

  return (
    <>
      {/* ── Zona 1: Entrevista + Agenda ────────────────────────────────── */}
      {/* Partido destacado ya no se renderiza aquí — vive en la sidebar */}
      {(interview || clip || hasAgenda) && (
        <section className="bg-sp-black border-t border-white/[0.06] py-10 md:py-14">
          <div className="max-w-7xl mx-auto px-5 md:px-8">
            <SectionHeader label="Cobertura en directo" title="Destacados" />
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-5">
              {/* Izquierda: entrevista o clip destacado */}
              {interview
                ? <FeaturedPostCard post={interview} label="Entrevista" />
                : clip
                  ? <FeaturedPostCard post={clip} label="Clip" />
                  : <div className="hidden lg:block" />}

              {/* Derecha: agenda del día */}
              <div className="flex flex-col gap-4">
                {hasAgenda && <AgendaWidget items={agenda} />}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── Zona YouTube: Clips de creadores ───────────────────────────── */}
      <section className="bg-[#06080c] border-t border-white/[0.06] py-10 md:py-14">
        <div className="max-w-7xl mx-auto px-5 md:px-8">
          <SectionHeader label="Clips de creadores" title="YouTube SocialPro" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {STATIC_YOUTUBE_CLIPS.map((clip) => <YouTubeCard key={clip.youtubeUrl} clip={clip} />)}
          </div>
        </div>
      </section>

      {/* ── Ecosistema SocialPro — strips compactos ────────────────────── */}
      <section className="bg-sp-black border-t border-white/[0.06] py-5">
        <div className="max-w-7xl mx-auto px-5 md:px-8">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Sorteos */}
            <Link href="/sorteos"
              className="flex-1 flex items-center gap-3 bg-sp-grad rounded-xl px-4 py-3 hover:opacity-90 transition-opacity group">
              <div className="shrink-0 w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center text-sm">🎁</div>
              <div className="min-w-0">
                <p className="text-[9px] font-bold uppercase tracking-wider text-white/70">Sorteos activos</p>
                <p className="font-display font-black uppercase text-white text-sm leading-tight">Gana skins CS2</p>
              </div>
              <span className="ml-auto text-white/60 group-hover:translate-x-0.5 transition-transform text-sm">→</span>
            </Link>
            {/* Códigos */}
            <Link href="/giveaways"
              className="flex-1 flex items-center gap-3 bg-white/[0.05] border border-white/[0.08] rounded-xl px-4 py-3 hover:border-white/20 transition-colors group">
              <div className="shrink-0 w-8 h-8 rounded-lg bg-sp-orange/15 border border-sp-orange/20 flex items-center justify-center text-sm">%</div>
              <div className="min-w-0">
                <p className="text-[9px] font-bold uppercase tracking-wider text-sp-orange">Códigos descuento</p>
                <p className="font-display font-black uppercase text-white text-sm leading-tight">Usa el código de tu creator</p>
              </div>
              <span className="ml-auto text-white/40 group-hover:translate-x-0.5 transition-transform text-sm">→</span>
            </Link>
            {/* Apuesta Segura */}
            <Link href="/apuesta-segura-cs2"
              className="flex-1 flex items-center gap-3 bg-white/[0.05] border border-white/[0.08] rounded-xl px-4 py-3 hover:border-sp-pink/30 transition-colors group">
              <div className="shrink-0 w-8 h-8 rounded-lg bg-sp-grad flex items-center justify-center">
                <Image src="/images/logos/2.png" alt="SocialPro" width={16} height={16} className="object-contain" />
              </div>
              <div className="min-w-0">
                <p className="text-[9px] font-bold uppercase tracking-wider text-sp-orange">Apuesta Segura CS2</p>
                <p className="font-display font-black uppercase text-white text-sm leading-tight">Análisis competitivo · ArkeroZ</p>
              </div>
              <span className="ml-auto text-white/40 group-hover:translate-x-0.5 transition-transform text-sm">→</span>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
