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
  readonly complianceStatus: Cs2MarketAssessmentStatus;
  readonly complianceLabel: string;
  readonly complianceExplanation: string;
  readonly complianceSourceUrl: string | null;
  readonly complianceCheckedAt: string;
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

export function matchesTargetLanguage(
  channel: YouTubeChannelPreview,
  language: TargetLanguage,
): boolean {
  if (language === 'any') return true;
  if (channel.defaultLanguage?.toLowerCase().startsWith(language)) return true;
  return language === 'es' && looksSpanish(channel);
}

export function qualifyYouTubeChannel(
  channel: YouTubeChannelPreview,
  performance: YouTubeRecentPerformance,
  market: Cs2SearchMarket,
  language: TargetLanguage = 'es',
  campaignType: Cs2CampaignType = 'case-gambling',
  minimumVideos = 8,
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
  if (performance.videoCount > 0 && performance.minViews < minimumViews) {
    reasons.push(`Mínimo reciente: ${performance.minViews.toLocaleString('es-ES')} vistas`);
  }
  if (performance.videoCount === 0) reasons.push('Sin vídeos en la ventana elegida');

  return {
    ...channel,
    ...performance,
    languageMatches,
    complianceStatus: compliance.status,
    complianceLabel: compliance.label,
    complianceExplanation: compliance.explanation,
    complianceSourceUrl: compliance.sourceUrl,
    complianceCheckedAt: compliance.checkedAt,
    isQualified: reasons.length === 0,
    reasons,
  };
}
