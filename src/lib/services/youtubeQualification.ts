import type { YouTubeChannelPreview, YouTubeRecentPerformance } from './youtube';
import {
  assessCs2Market,
  type Cs2CampaignType,
  type Cs2MarketAssessmentStatus,
  type Cs2SearchMarket,
  type TargetLanguage,
} from '@/lib/compliance/cs2Markets';

export type YouTubeQualification = YouTubeChannelPreview & YouTubeRecentPerformance & {
  readonly languageMatches: boolean;
  readonly isQualified: boolean;
  readonly fitScore: number;
  readonly complianceStatus: Cs2MarketAssessmentStatus;
  readonly complianceLabel: string;
  readonly complianceExplanation: string;
  readonly complianceSourceUrl: string | null;
  readonly complianceCheckedAt: string;
  readonly reasons: readonly string[];
  readonly signals: readonly string[];
};

const SPANISH_HINTS = [
  'español', 'castellano', 'latino', 'latam', 'jugando', 'partida', 'equipo', 'canal', 'directo',
] as const;

export function looksSpanish(channel: YouTubeChannelPreview): boolean {
  if (channel.defaultLanguage) return channel.defaultLanguage.toLowerCase().split('-')[0] === 'es';
  const text = `${channel.title} ${channel.description}`.toLowerCase();
  return SPANISH_HINTS.some((hint) => text.includes(hint));
}

export function matchesTargetLanguage(
  channel: YouTubeChannelPreview,
  language: TargetLanguage,
): boolean {
  if (language === 'any') return true;
  if (channel.defaultLanguage) return channel.defaultLanguage.toLowerCase().split('-')[0] === language;
  return language === 'es' && looksSpanish(channel);
}

export function qualifyYouTubeChannel(
  channel: YouTubeChannelPreview,
  performance: YouTubeRecentPerformance,
  market: Cs2SearchMarket,
  language: TargetLanguage = 'es',
  campaignType: Cs2CampaignType = 'case-gambling',
  minimumVideos = 3,
  minimumViews = 1_000,
): YouTubeQualification {
  const languageMatches = matchesTargetLanguage(channel, language);
  const compliance = assessCs2Market(channel.country, campaignType);
  const reasons: string[] = [];

  if (market !== 'GLOBAL' && channel.country !== market) {
    reasons.push(`País del canal: ${channel.country ?? 'sin declarar'}`);
  }
  if (!languageMatches) reasons.push('Idioma solicitado no confirmado');
  if (!compliance.eligible) reasons.push(compliance.explanation);
  if (performance.videoCount < minimumVideos) {
    reasons.push(`${performance.videoCount}/${minimumVideos} vídeos recientes`);
  }
  if (performance.videoCount > 0 && performance.medianViews < minimumViews) {
    reasons.push(`Mediana reciente: ${performance.medianViews.toLocaleString('es-ES')} vistas`);
  }
  if (performance.videoCount === 0) reasons.push('Sin vídeos en la ventana elegida');

  const daysSinceLastVideo = performance.lastVideoAt
    ? Math.max(0, Math.floor((Date.now() - performance.lastVideoAt.getTime()) / 86_400_000))
    : null;
  // Activity is the configured recent-video window; freshness and fit remain informative.
  const fitScore = scoreYouTubeProspect(channel, performance, daysSinceLastVideo);

  const signals = [
    `${performance.videoCount} vídeos en ${performance.windowDays} días`,
    `Mediana de ${performance.medianViews.toLocaleString('es-ES')} vistas`,
    `${performance.videosAtOrAbove1000}/${performance.videoCount} vídeos con al menos 1.000 vistas`,
  ];
  if (channel.subscriberCount !== null && channel.subscriberCount > 0) {
    const efficiency = Math.round((performance.medianViews / channel.subscriberCount) * 100);
    signals.push(`Mediana equivalente al ${efficiency}% de suscriptores`);
  }
  if (daysSinceLastVideo !== null) signals.push(`Último vídeo hace ${daysSinceLastVideo} días`);

  return {
    ...channel,
    ...performance,
    languageMatches,
    complianceStatus: compliance.status,
    complianceLabel: compliance.label,
    complianceExplanation: compliance.explanation,
    complianceSourceUrl: compliance.sourceUrl,
    complianceCheckedAt: compliance.checkedAt,
    fitScore,
    isQualified: reasons.length === 0,
    reasons,
    signals,
  };
}

function scoreYouTubeProspect(
  channel: YouTubeChannelPreview,
  performance: YouTubeRecentPerformance,
  daysSinceLastVideo: number | null,
): number {
  let score = performance.videoCount >= 8 ? 25 : performance.videoCount >= 5 ? 22 : performance.videoCount >= 3 ? 18 : 0;

  score += performance.medianViews >= 10_000
    ? 30
    : performance.medianViews >= 3_000
      ? 25
      : performance.medianViews >= 1_000
        ? 20
        : Math.min(18, Math.round((performance.medianViews / 1_000) * 18));

  if (daysSinceLastVideo !== null) {
    score += daysSinceLastVideo <= 14 ? 15 : daysSinceLastVideo <= 30 ? 12 : daysSinceLastVideo <= 45 ? 8 : 0;
  }

  if (channel.subscriberCount === null) {
    // No audience-size/efficiency bonus for an unavailable metric.
  } else if (channel.subscriberCount <= 0) {
    score += 10;
  } else {
    const viewsPerSubscriber = performance.medianViews / channel.subscriberCount;
    score += viewsPerSubscriber >= 1
      ? 20
      : viewsPerSubscriber >= 0.3
        ? 18
        : viewsPerSubscriber >= 0.1
          ? 14
          : viewsPerSubscriber >= 0.03
            ? 8
            : 4;
  }

  score += channel.subscriberCount === null ? 0 : channel.subscriberCount < 1_000
    ? 8
    : channel.subscriberCount <= 250_000
      ? 10
      : channel.subscriberCount <= 1_000_000
        ? 5
        : 2;

  return Math.max(0, Math.min(score, 100));
}
