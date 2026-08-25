import type { YouTubeChannelPreview, YouTubeRecentPerformance } from './youtube';

export const VERIFIED_GAMBLING_MARKETS = ['ES', 'CO', 'PE'] as const;
export type VerifiedGamblingMarket = (typeof VERIFIED_GAMBLING_MARKETS)[number];

export type YouTubeQualification = YouTubeChannelPreview & YouTubeRecentPerformance & {
  readonly isSpanish: boolean;
  readonly isQualified: boolean;
  readonly reasons: readonly string[];
};

const SPANISH_HINTS = [
  'español', 'castellano', 'latino', 'latam', 'counter strike', 'counter-strike',
  'cs2', 'gaming', 'jugando', 'partida', 'equipo', 'canal', 'directo',
] as const;

export function looksSpanish(channel: YouTubeChannelPreview): boolean {
  if (channel.defaultLanguage?.toLowerCase().startsWith('es')) return true;
  const text = `${channel.title} ${channel.description}`.toLowerCase();
  return SPANISH_HINTS.some((hint) => text.includes(hint));
}

export function qualifyYouTubeChannel(
  channel: YouTubeChannelPreview,
  performance: YouTubeRecentPerformance,
  market: VerifiedGamblingMarket,
  minimumVideos = 8,
  minimumViews = 1_000,
): YouTubeQualification {
  const isSpanish = looksSpanish(channel);
  const reasons: string[] = [];

  if (channel.country !== market) reasons.push(`País del canal: ${channel.country ?? 'sin declarar'}`);
  if (!isSpanish) reasons.push('Idioma español no confirmado');
  if (performance.videoCount < minimumVideos) {
    reasons.push(`${performance.videoCount}/${minimumVideos} vídeos recientes`);
  }
  if (performance.videoCount > 0 && performance.minViews < minimumViews) {
    reasons.push(`Mínimo reciente: ${performance.minViews.toLocaleString('es-ES')} vistas`);
  }
  if (performance.videoCount === 0) reasons.push('Sin vídeos en la ventana elegida');

  return {
    ...channel,
    ...performance,
    isSpanish,
    isQualified: reasons.length === 0,
    reasons,
  };
}
