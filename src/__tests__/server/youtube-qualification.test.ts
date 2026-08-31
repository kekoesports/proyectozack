import { qualifyYouTubeChannel } from '@/lib/services/youtubeQualification';
import type { YouTubeChannelPreview, YouTubeRecentPerformance } from '@/lib/services/youtube';

const channel: YouTubeChannelPreview = {
  channelId: 'UC_socialpro',
  handle: 'socialpro',
  title: 'Canal CS2 Español',
  description: 'Partidas y análisis de Counter-Strike 2 en español',
  thumbnailUrl: null,
  subscriberCount: 10_000,
  country: 'ES',
  defaultLanguage: 'es',
  videoCount: 120,
};

const performance: YouTubeRecentPerformance = {
  channelId: channel.channelId,
  windowDays: 90,
  videoCount: 8,
  minViews: 1_000,
  avgViews: 2_400,
  medianViews: 2_400,
  videosAtOrAbove1000: 8,
  lastVideoAt: new Date(),
};

describe('qualifyYouTubeChannel', () => {
  it('aprueba solo cuando mercado, idioma, actividad y vistas cumplen', () => {
    const result = qualifyYouTubeChannel(channel, performance, 'ES');
    expect(result.isQualified).toBe(true);
    expect(result.reasons).toEqual([]);
  });

  it('explica todos los criterios incumplidos', () => {
    const result = qualifyYouTubeChannel(
      { ...channel, country: null, defaultLanguage: 'en', title: 'FPS clips', description: '' },
      { ...performance, videoCount: 2, minViews: 400, medianViews: 400, videosAtOrAbove1000: 0 },
      'CO',
    );
    expect(result.isQualified).toBe(false);
    expect(result.reasons).toEqual(expect.arrayContaining([
      'País del canal: sin declarar',
      'Idioma solicitado no confirmado',
      '2/3 vídeos recientes',
    ]));
  });

  it('preselecciona worldwide para marketplace sin azar con país declarado', () => {
    const result = qualifyYouTubeChannel(
      { ...channel, country: 'AR', defaultLanguage: 'es' },
      performance,
      'GLOBAL',
      'any',
      'marketplace',
    );
    expect(result.isQualified).toBe(true);
    expect(result.complianceStatus).toBe('marketplace-scope-only');
  });

  it('mantiene en revisión el gambling de un país sin fuente validada', () => {
    const result = qualifyYouTubeChannel(
      { ...channel, country: 'AR' },
      performance,
      'GLOBAL',
      'any',
      'case-gambling',
    );
    expect(result.isQualified).toBe(false);
    expect(result.complianceStatus).toBe('manual-review');
  });

  it('bloquea cajas en un mercado marcado por su regulador como restringido', () => {
    const result = qualifyYouTubeChannel(
      { ...channel, country: 'FR' },
      performance,
      'GLOBAL',
      'any',
      'case-gambling',
    );
    expect(result.isQualified).toBe(false);
    expect(result.complianceStatus).toBe('restricted');
  });

  it('no descarta una promesa por un vídeo aislado por debajo de 1.000', () => {
    const result = qualifyYouTubeChannel(
      channel,
      { ...performance, minViews: 200, medianViews: 2_100, avgViews: 50_000, videosAtOrAbove1000: 6 },
      'ES',
    );
    expect(result.isQualified).toBe(true);
  });

  it('rechaza una media inflada si la mediana real no llega a 1.000', () => {
    const result = qualifyYouTubeChannel(
      channel,
      { ...performance, minViews: 100, medianViews: 999, avgViews: 50_000, videosAtOrAbove1000: 3 },
      'ES',
    );
    expect(result.isQualified).toBe(false);
    expect(result.reasons[0]).toContain('Mediana reciente');
  });

  it('premia un canal pequeño que convierte suscriptores en vistas', () => {
    const result = qualifyYouTubeChannel(
      { ...channel, subscriberCount: 4_000 },
      { ...performance, videoCount: 3, medianViews: 1_400, avgViews: 1_800, videosAtOrAbove1000: 2 },
      'GLOBAL',
      'any',
      'marketplace',
    );
    expect(result.isQualified).toBe(true);
    expect(result.fitScore).toBeGreaterThanOrEqual(60);
    expect(result.signals.join(' ')).toContain('Mediana');
  });
});
