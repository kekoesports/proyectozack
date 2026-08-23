import {
  buildTalentImageAlt,
  buildTalentMetaDescription,
  buildTalentSearchTitle,
  stripSocialProSuffix,
  type TalentSeoInput,
} from '@/lib/talentSeo';

const huasopeek: TalentSeoInput = {
  name: 'HUASOPEEK',
  role: 'PRO PLAYER CS2',
  game: 'CS2',
  platform: 'twitch',
  creatorCountry: 'CL',
  socials: [
    { platform: 'youtube', followersDisplay: '5.1K', sortOrder: 2 },
    { platform: 'twitch', followersDisplay: '29.7K', sortOrder: 1 },
  ],
};

describe('talentSeo', () => {
  it('elimina uno o varios sufijos de marca', () => {
    expect(stripSocialProSuffix('HUASOPEEK | SocialPro | SocialPro')).toBe('HUASOPEEK');
    expect(stripSocialProSuffix('HUASOPEEK — SocialPro')).toBe('HUASOPEEK');
  });

  it('genera title sin seguidores ni marca duplicada', () => {
    expect(buildTalentSearchTitle(huasopeek)).toBe('HUASOPEEK — Jugador profesional de CS2');
  });

  it('usa métricas sociales actuales, prioriza plataforma principal y evita duplicados', () => {
    const description = buildTalentMetaDescription({
      ...huasopeek,
      socials: [
        { platform: 'youtube', followersDisplay: '100', sortOrder: 2 },
        { platform: 'youtube', followersDisplay: '5.1K', sortOrder: 3 },
        { platform: 'twitch', followersDisplay: '29.7K', sortOrder: 1 },
      ],
    });

    expect(description).toContain('29.7K seguidores en Twitch');
    expect(description).toContain('5.1K seguidores en YouTube');
    expect(description).not.toContain('100 seguidores');
    expect(description.length).toBeLessThanOrEqual(156);
  });

  it('genera un alt descriptivo con país real y sin cifras', () => {
    expect(buildTalentImageAlt(huasopeek)).toBe(
      'Perfil de HUASOPEEK, jugador profesional de CS2 de Chile, representado por SocialPro',
    );
  });

  it('omite juegos genéricos y métricas vacías', () => {
    const creator: TalentSeoInput = {
      name: 'RINNA',
      role: 'CONTENT CREATOR',
      game: 'Content Creator',
      platform: 'youtube',
      creatorCountry: 'ES',
      socials: [{ platform: 'youtube', followersDisplay: '-' }],
    };

    expect(buildTalentSearchTitle(creator)).toBe('RINNA — Creador de contenido');
    expect(buildTalentMetaDescription(creator)).not.toContain('seguidores');
  });
});
