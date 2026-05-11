import type { PostBlocks } from '@/features/news/components/article-blocks/types';

/**
 * Bloques editoriales para
 * `gentle-mates-cambio-tono-astana-2026`.
 *
 * Layout interleaved con tres bloques visuales: match (2-0 vs HEROIC),
 * roster español (Martinez detectado vía talentSlug), 2 embeds X (HLTV +
 * CroissantStrike). Sin Quote — no hay cita verificada nueva.
 *
 * Cover pendiente: el usuario sube `public/images/news/gentle-mates-astana-cambio-tono.webp`
 * y el script de insert actualiza `posts.cover_url` cuando llegue.
 */
export const blocks: PostBlocks = {
  matchContext: {
    event: 'PGL Astana 2026',
    stage: 'Swiss · 2-0 en stage',
    format: 'BO3',
    teamA: { name: 'Gentle Mates', score: 2 },
    teamB: { name: 'HEROIC', score: 0 },
    maps: [],
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
  embeds: [
    {
      platform: 'x',
      url: 'https://x.com/HLTVorg/status/2053727846686683645',
      title: 'Gentle Mates 2-0 HEROIC — resumen HLTV',
      author: 'HLTVorg',
      publishedAt: '11 May 2026',
    },
    {
      platform: 'x',
      url: 'https://x.com/CroissantStrike/status/2053729447426093184',
      title: 'Reacción CroissantStrike al cruce contra HEROIC',
      author: 'CroissantStrike',
      publishedAt: '11 May 2026',
    },
  ],
  layout: [
    { kind: 'section', title: null },
    { kind: 'matchContext' },
    { kind: 'section', title: 'No es solo el resultado' },
    { kind: 'embed', index: 0 },
    { kind: 'section', title: 'La grieta de K27 y la confirmación de HEROIC' },
    { kind: 'embed', index: 1 },
    { kind: 'section', title: 'El roster español que rompe el bloqueo' },
    { kind: 'roster' },
    { kind: 'section', title: 'Qué significa en Astana' },
    { kind: 'section', title: 'Cierre' },
  ],
};
