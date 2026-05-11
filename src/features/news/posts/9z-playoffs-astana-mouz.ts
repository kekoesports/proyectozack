import type { PostBlocks } from '@/features/news/components/article-blocks/types';

/**
 * Bloques editoriales para `9z-playoffs-astana-mouz`.
 *
 * Match: PGL Astana 2026 · Swiss · 3-0 stage · 2-1 vs MOUZ
 *   Ancient 13-10 · Dust2 0-13 · Anubis 13-8
 *
 * Roster: HUASOPEEK (CL, SocialPro talent), dgt/max/meyern/luchov (AR
 * default — pueden corregirse en este file si el country real difiere).
 */
export const blocks: PostBlocks = {
  matchContext: {
    event: 'PGL Astana 2026',
    stage: 'Swiss · 3-0 en stage',
    format: 'BO3',
    teamA: { name: '9z', score: 2 },
    teamB: { name: 'MOUZ', score: 1 },
    maps: [
      { name: 'Ancient', scoreA: 13, scoreB: 10 },
      { name: 'Dust2', scoreA: 0, scoreB: 13 },
      { name: 'Anubis', scoreA: 13, scoreB: 8 },
    ],
    status: 'won',
  },
  roster: {
    teamName: '9z',
    players: [
      { nick: 'HUASOPEEK', country: 'CL', status: 'starter', talentSlug: 'huasopeek' },
      { nick: 'dgt', country: 'AR', status: 'starter' },
      { nick: 'max', country: 'AR', status: 'starter' },
      { nick: 'meyern', country: 'AR', status: 'starter' },
      { nick: 'luchov', country: 'AR', status: 'starter' },
    ],
  },
  layout: [
    { kind: 'section', title: null },
    { kind: 'matchContext' },
    { kind: 'section', title: '3-0 perfecto para 9z' },
    { kind: 'section', title: 'HUASOPEEK sigue creciendo en Tier 1' },
    { kind: 'roster' },
    { kind: 'section', title: 'Astana está dejando una narrativa clara' },
    { kind: 'section', title: 'Lo que viene ahora' },
  ],
};
