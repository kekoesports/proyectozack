import { getCs2RosterForSidebar } from '@/lib/queries/live';
import { getNewsPosts } from '@/lib/queries/posts';
import { PICK_PREVIEWS } from '@/app/apuesta-segura-cs2/_components/tokens';
import type { LiveBarItem } from './types';

const DAY_MS = 24 * 60 * 60 * 1000;
const STALE_LIVE_MS = 15 * 60 * 1000;

function relativeTime(date: Date | null): string | null {
  if (!date) return null;
  const ms = Date.now() - date.getTime();
  if (ms < 0) return null;
  const min = Math.floor(ms / 60000);
  if (min < 1) return 'ahora mismo';
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `hace ${d} ${d === 1 ? 'día' : 'días'}`;
  return null;
}

function pluralize(n: number, sing: string, plur: string): string {
  return `${n} ${n === 1 ? sing : plur}`;
}

/**
 * Construye los items del LiveBar a partir de datos ya existentes en el
 * sistema. NO hace queries nuevas a APIs externas — solo lee DB local
 * y constantes editoriales (PICK_PREVIEWS).
 *
 * Orden de prioridad en el array (cómo aparecen en rotación):
 *   1. streams_live (si hay live ahora)
 *   2. matches_preview (si hay pick con status 'live' en PICK_PREVIEWS)
 *   3. editorial_pick (si hay pick con status 'win' reciente)
 *   4. posts_recent (si hay >0 posts publicados últimas 24h)
 *   5. last_post (fallback: post más reciente si no hubo en 24h)
 *
 * Si el array final tiene <2 items, el componente client no rota
 * (estado fijo). Si tiene 0, el componente no se renderiza.
 */
export async function buildLiveBarItems(): Promise<LiveBarItem[]> {
  const [creators, posts] = await Promise.all([
    getCs2RosterForSidebar(),
    getNewsPosts(),
  ]);

  const items: LiveBarItem[] = [];
  const now = Date.now();

  // 1. Streams live ahora — solo si hay creators con isLive=true Y
  //    lastCheckedAt fresh (<15 min). El query ya descarta isLive si
  //    stale, pero filtramos doble por seguridad UX.
  const liveCreators = creators.filter((c) => {
    if (!c.isLive) return false;
    if (!c.lastCheckedAt) return false;
    return now - c.lastCheckedAt.getTime() < STALE_LIVE_MS;
  });
  if (liveCreators.length > 0) {
    const top = liveCreators[0];
    if (top) {
      items.push({
        kind: 'streams_live',
        label: 'Live',
        text: pluralize(liveCreators.length, 'stream ahora', 'streams ahora'),
        meta: liveCreators.length === 1 ? top.name : `${top.name} y otros`,
        href: '/news',
        accent: 'emerald',
      });
    }
  }

  // 2. Match en curso — desde PICK_PREVIEWS editorial existente
  const livePick = PICK_PREVIEWS.find((p) => p.status === 'live');
  if (livePick) {
    items.push({
      kind: 'matches_preview',
      label: 'En curso',
      text: `${livePick.teamA} vs ${livePick.teamB}`,
      meta: `${livePick.league} · ${livePick.map}`,
      href: '/apuesta-segura-cs2',
      accent: 'pink',
    });
  }

  // 3. Pick editorial reciente con resultado
  const winningPick = PICK_PREVIEWS.find((p) => p.status === 'win');
  if (winningPick) {
    items.push({
      kind: 'editorial_pick',
      label: 'Pick',
      text: `${winningPick.teamA} ${winningPick.score ?? ''}`.trim(),
      meta: `${winningPick.market} @${winningPick.odds}`,
      href: '/apuesta-segura-cs2',
      accent: 'purple',
    });
  }

  // 4. Posts recientes — últimas 24h
  const recent = posts.filter((p) => {
    if (!p.publishedAt) return false;
    return now - p.publishedAt.getTime() < DAY_MS;
  });
  if (recent.length > 0) {
    const latest = recent[0];
    if (latest) {
      items.push({
        kind: 'posts_recent',
        label: '24h',
        text: pluralize(recent.length, 'noticia nueva', 'noticias nuevas'),
        meta: latest.title.length > 70 ? latest.title.slice(0, 67) + '…' : latest.title,
        href: `/news/${latest.slug}`,
        accent: 'orange',
      });
    }
  } else {
    // 5. Fallback: post más reciente con timestamp relativo honesto
    const last = posts[0];
    if (last && last.publishedAt) {
      const rel = relativeTime(last.publishedAt);
      if (rel) {
        items.push({
          kind: 'last_post',
          label: 'Última',
          text: last.title.length > 70 ? last.title.slice(0, 67) + '…' : last.title,
          meta: rel,
          href: `/news/${last.slug}`,
          accent: 'orange',
        });
      }
    }
  }

  return items;
}
