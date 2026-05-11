import type { PostBlocks } from '@/features/news/components/article-blocks/types';

/**
 * Bloques editoriales para la noticia
 * `gentle-mates-alex-romper-barreras-mentales-astana`.
 *
 * Datos:
 *   - Match: PGL Astana 2026 · Swiss Round 2 · Gentle Mates 2-1 K27
 *           (Nuke 13-9 / Overpass 9-13 / Ancient 13-10)
 *   - Roster: 5 starters ES + 1 banco ES + coach ES. Martinez es starter
 *     y tiene talentSlug=`martinez` → renderiza pill SocialPro + link a /talentos.
 *   - Quote: alex post-victoria. Una sola, intencionalmente.
 *   - Embed: card link al post de HLTV en X (sin twitter widgets.js).
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
    },
  ],
};
