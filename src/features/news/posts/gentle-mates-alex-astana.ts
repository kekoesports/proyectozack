import type { PostBlocks } from '@/features/news/components/article-blocks/types';

/**
 * Bloques editoriales para
 * `gentle-mates-alex-romper-barreras-mentales-astana`.
 *
 * Layout interleaved: el body se parte por `## H2` y se entremezcla con
 * los bloques visuales en el orden definido en `layout`. Los títulos en
 * `layout` deben coincidir EXACTAMENTE con los H2 del body.
 */
export const blocks: PostBlocks = {
  matchContext: {
    event: 'PGL Astana 2026',
    stage: 'Swiss Round 2',
    format: 'BO3',
    teamA: { name: 'Gentle Mates', score: 2 },
    teamB: { name: 'K27', score: 1 },
    maps: [
      { name: 'Nuke', scoreA: 13, scoreB: 9 },
      { name: 'Overpass', scoreA: 9, scoreB: 13 },
      { name: 'Ancient', scoreA: 13, scoreB: 10 },
    ],
    status: 'won',
  },
  roster: {
    teamName: 'Gentle Mates',
    coach: { nick: 'repk3ys', country: 'ES' },
    players: [
      { nick: 'alex', country: 'ES', status: 'starter' },
      { nick: 'dav1g', country: 'ES', status: 'starter' },
      { nick: 'Martinez', country: 'ES', status: 'starter', talentSlug: 'martinez' },
      { nick: 'mopoz', country: 'ES', status: 'starter' },
      { nick: 'sausol', country: 'ES', status: 'starter' },
      { nick: 'deLonge', country: 'ES', status: 'benched' },
    ],
  },
  quotes: [
    {
      quote: 'Esta era la victoria que necesitábamos.',
      attribution: 'alex',
      context: 'Tras el 2-1 a K27 en PGL Astana 2026',
    },
  ],
  embeds: [
    {
      platform: 'x',
      url: 'https://x.com/HLTVorg/status/2053385840244527162',
      title: 'alex tras la victoria — entrevista HLTV',
      author: 'HLTVorg',
      excerpt: '"Necesitábamos romper barreras mentales para volver a nuestra mejor versión. Esta era la victoria que necesitábamos para reconducir la temporada."',
      publishedAt: '11 May 2026',
    },
  ],
  layout: [
    { kind: 'section', title: null },
    { kind: 'matchContext' },
    { kind: 'section', title: 'El bloqueo' },
    { kind: 'quote', index: 0 },
    { kind: 'section', title: 'La grieta' },
    { kind: 'embed', index: 0 },
    { kind: 'section', title: 'Reconstrucción en marcha' },
    { kind: 'section', title: 'Lo que pesa fuera del servidor' },
    { kind: 'section', title: 'Foco hispano' },
    { kind: 'roster' },
  ],
};
