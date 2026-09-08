import {
  isLikelyPublisherChannel,
  qualifyTwitchCandidate,
} from '@/lib/targets/qualification';

const candidate = {
  followers: 10_001,
  viewers: 180,
  averageViewers24h: 80,
  cs2ContentShare24h: 0.3,
  language: 'es',
  requiredLanguage: null,
  game: 'Counter-Strike 2',
  isLive: true,
  minimumFollowers: 10_000,
} as const;

describe('qualifyTwitchCandidate', () => {
  it('preselecciona un canal activo de CS2 con audiencia suficiente', () => {
    const result = qualifyTwitchCandidate(candidate);

    expect(result.isQualified).toBe(true);
    expect(result.status).toBe('qualified');
    expect(result.score).toBeGreaterThanOrEqual(80);
    expect(result.reasons).toContain('Revisar país y encaje legal antes de contactar');
  });

  it('exige más de 10.000 seguidores', () => {
    const result = qualifyTwitchCandidate({ ...candidate, followers: 10_000 });

    expect(result.isQualified).toBe(false);
    expect(result.status).toBe('rejected');
    expect(result.reasons.join(' ')).toContain('no supera 10.000');
  });

  it('rechaza una media inferior a 80', () => {
    const result = qualifyTwitchCandidate({ ...candidate, averageViewers24h: 79 });

    expect(result.isQualified).toBe(false);
    expect(result.status).toBe('rejected');
    expect(result.reasons[0]).toContain('inferior a 80');
  });

  it('no preselecciona sin una media histórica aunque el directo actual sea grande', () => {
    const result = qualifyTwitchCandidate({ ...candidate, viewers: 5_000, averageViewers24h: null });

    expect(result.isQualified).toBe(false);
    expect(result.status).toBe('review');
    expect(result.reasons[0]).toContain('requiere medición');
  });

  it('rechaza una proporción de CS2 inferior al 30%', () => {
    const result = qualifyTwitchCandidate({ ...candidate, cs2ContentShare24h: 0.29 });

    expect(result.isQualified).toBe(false);
    expect(result.status).toBe('rejected');
    expect(result.reasons.join(' ')).toContain('inferior al 30%');
  });

  it('permite cualquier idioma cuando el filtro es global', () => {
    const result = qualifyTwitchCandidate({
      ...candidate,
      language: 'pt',
      game: 'Just Chatting',
      requiredLanguage: null,
    });

    expect(result.isQualified).toBe(true);
  });
});

describe('isLikelyPublisherChannel', () => {
  it.each([
    'ESL Counter-Strike',
    'ESL Counter-Strike Highlights',
    'PGL',
    'Team Spirit CS',
    'BLAST Premier',
    'CS News',
    'CS2TV',
  ])('separa organizaciones y medios: %s', (title) => {
    expect(isLikelyPublisherChannel(title)).toBe(true);
  });

  it.each(['ScreaM', 'renyan', 'H4RN', 'PHY'])('mantiene creadores personales: %s', (title) => {
    expect(isLikelyPublisherChannel(title)).toBe(false);
  });
});
