import {
  isLikelyPublisherChannel,
  qualifyTwitchCandidate,
} from '@/lib/targets/qualification';

const candidate = {
  followers: 5_400,
  viewers: 180,
  averageCs2Viewers30d: 90,
  language: 'es',
  requiredLanguage: 'es',
  game: 'Counter-Strike 2',
  isLive: true,
  minimumFollowers: 1_000,
} as const;

describe('qualifyTwitchCandidate', () => {
  it('preselecciona un canal activo de CS2 con audiencia suficiente', () => {
    const result = qualifyTwitchCandidate(candidate);

    expect(result.isQualified).toBe(true);
    expect(result.status).toBe('review');
    expect(result.score).toBeGreaterThanOrEqual(80);
    expect(result.reasons).toContain('Revisar país y encaje legal antes de contactar');
  });

  it('rechaza y explica una audiencia insuficiente', () => {
    const result = qualifyTwitchCandidate({ ...candidate, followers: 450, viewers: 5, averageCs2Viewers30d: 69 });

    expect(result.isQualified).toBe(false);
    expect(result.status).toBe('rejected');
    expect(result.reasons[0]).toContain('inferior a 70');
  });

  it('mantiene en amarillo una media de CS2 entre 70 y 89', () => {
    const result = qualifyTwitchCandidate({ ...candidate, followers: 180, viewers: 35, averageCs2Viewers30d: 70 });

    expect(result.isQualified).toBe(false);
    expect(result.status).toBe('review');
    expect(result.reasons[0]).toContain('nivel amarillo');
  });

  it('no preselecciona sin una media histórica aunque el directo actual sea grande', () => {
    const result = qualifyTwitchCandidate({ ...candidate, viewers: 5_000, averageCs2Viewers30d: null });

    expect(result.isQualified).toBe(false);
    expect(result.status).toBe('review');
    expect(result.reasons[0]).toContain('solo revisión amarilla');
  });

  it('rechaza categorías ajenas a CS2', () => {
    const result = qualifyTwitchCandidate({ ...candidate, game: 'Just Chatting' });

    expect(result.isQualified).toBe(false);
    expect(result.reasons).toContain('Juego del perfil no confirmado');
  });

  it('respeta el filtro de idioma cuando está configurado', () => {
    const result = qualifyTwitchCandidate({ ...candidate, language: 'en' });

    expect(result.isQualified).toBe(false);
    expect(result.reasons).toContain('Idioma en no coincide');
  });

  it('permite cualquier idioma cuando el filtro es global', () => {
    const result = qualifyTwitchCandidate({
      ...candidate,
      language: 'pt',
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
