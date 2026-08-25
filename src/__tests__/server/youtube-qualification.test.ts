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
  lastVideoAt: new Date('2026-08-24T10:00:00Z'),
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
      { ...performance, videoCount: 5, minViews: 400 },
      'CO',
    );
    expect(result.isQualified).toBe(false);
    expect(result.reasons).toEqual(expect.arrayContaining([
      'País del canal: sin declarar',
      'Idioma español no confirmado',
      '5/8 vídeos recientes',
    ]));
  });

  it('no confunde la media con el mínimo exigido', () => {
    const result = qualifyYouTubeChannel(
      channel,
      { ...performance, minViews: 999, avgViews: 50_000 },
      'ES',
    );
    expect(result.isQualified).toBe(false);
    expect(result.reasons[0]).toContain('Mínimo reciente');
  });
});
