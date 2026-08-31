import type { TargetQualificationStatus } from '@/lib/schemas/target';

export type TwitchFitInput = {
  readonly followers: number;
  readonly viewers: number;
  readonly language: string;
  readonly requiredLanguage: string | null;
  readonly game: string;
  readonly isLive: boolean;
  readonly minimumFollowers: number;
};

export type CreatorFit = {
  readonly isQualified: boolean;
  readonly score: number;
  readonly status: TargetQualificationStatus;
  readonly reasons: readonly string[];
};

const PUBLISHER_CHANNEL_PATTERNS = [
  /^team\s+/i,
  /\b(?:esl|pgl|blast|faceit|esea)\b/i,
  /\b(?:highlights|tournament|tournaments|league|esports organization)\b/i,
] as const;

export function isLikelyPublisherChannel(title: string): boolean {
  const normalized = title.trim();
  return PUBLISHER_CHANNEL_PATTERNS.some((pattern) => pattern.test(normalized));
}

export function qualifyTwitchCandidate(input: TwitchFitInput): CreatorFit {
  const languageMatches = input.requiredLanguage === null
    || input.language.toLowerCase() === input.requiredLanguage.toLowerCase();
  const gameMatches = /counter[- ]?strike|\bcs2\b/i.test(input.game);
  const audienceMatches = input.followers >= input.minimumFollowers;
  const isQualified = languageMatches && gameMatches && audienceMatches;

  let score = 0;
  if (audienceMatches) score += input.followers >= 5_000 ? 40 : 30;
  else score += Math.min(25, Math.round((input.followers / input.minimumFollowers) * 25));
  if (gameMatches) score += 30;
  if (languageMatches) score += 15;
  if (input.isLive) score += 10;
  if (input.viewers >= 100) score += 5;

  const reasons: string[] = [];
  if (audienceMatches) reasons.push(`${input.followers.toLocaleString('es-ES')} seguidores`);
  else reasons.push(`Audiencia inferior a ${input.minimumFollowers.toLocaleString('es-ES')}`);
  reasons.push(gameMatches ? 'Contenido actual de CS2' : 'CS2 no confirmado');
  if (!languageMatches) reasons.push(`Idioma ${input.language || 'desconocido'} no coincide`);
  if (input.isLive) reasons.push('Canal activo ahora');
  if (isQualified) reasons.push('Revisar país y encaje legal antes de contactar');

  return {
    isQualified,
    score: Math.max(0, Math.min(score, 100)),
    status: isQualified ? 'review' : 'rejected',
    reasons,
  };
}
