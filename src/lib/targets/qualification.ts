import type { TargetQualificationStatus } from '@/lib/schemas/target';

export type TwitchFitInput = {
  readonly followers: number | null;
  readonly viewers: number | null;
  readonly averageViewers30d: number | null;
  readonly cs2ContentShare30d: number | null;
  readonly language: string;
  readonly requiredLanguage: string | null;
  readonly game: string;
  readonly isLive: boolean | null;
  readonly minimumFollowers: number;
  readonly requiredGameNames?: readonly string[];
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
  /\b(?:highlights|news|media|tournament|tournaments|league|esports organization)\b/i,
  /tv$/i,
] as const;

export function isLikelyPublisherChannel(title: string): boolean {
  const normalized = title.trim();
  return PUBLISHER_CHANNEL_PATTERNS.some((pattern) => pattern.test(normalized));
}

export function qualifyTwitchCandidate(input: TwitchFitInput): CreatorFit {
  const languageMatches = input.requiredLanguage === null
    || input.language.toLowerCase() === input.requiredLanguage.toLowerCase();
  const gameMatches = input.requiredGameNames?.length
    ? input.requiredGameNames.some((game) => game.toLowerCase() === input.game.toLowerCase())
    : /counter[- ]?strike|\bcs2\b/i.test(input.game);
  const audienceMatches = input.averageViewers30d !== null && input.averageViewers30d >= 80;
  const audienceUnknown = input.averageViewers30d === null;
  const contentMatches = input.cs2ContentShare30d !== null && input.cs2ContentShare30d >= 0.3;
  const followersMatch = input.followers !== null && input.followers > input.minimumFollowers;

  let score = 0;
  if (gameMatches) score += 25;
  if (languageMatches) score += 10;
  if (input.isLive) score += 20;
  score += audienceMatches ? 25 : 0;
  score += contentMatches ? 20 : 0;
  score += followersMatch ? 10 : 0;
  if (input.followers !== null && input.followers > 0 && input.averageViewers30d !== null) {
    const liveEfficiency = input.averageViewers30d / input.followers;
    score += liveEfficiency >= 0.05 ? 10 : liveEfficiency >= 0.01 ? 7 : 3;
  } else if (audienceMatches) {
    score += 8;
  }

  const normalizedScore = Math.max(0, Math.min(score, 100));
  const isQualified = languageMatches
    && followersMatch
    && audienceMatches
    && contentMatches
    && normalizedScore >= 60;

  const reasons: string[] = [];
  if (audienceUnknown) reasons.push('Media verificada de 30 días no disponible: requiere medición');
  else if (audienceMatches) reasons.push(`${input.averageViewers30d.toLocaleString('es-ES')} espectadores medios (30d): cumple el mínimo de 80`);
  else reasons.push(`Media de 30 días inferior a 80 (${input.averageViewers30d.toLocaleString('es-ES')})`);
  if (input.cs2ContentShare30d === null) reasons.push('Porcentaje de contenido CS2 no disponible: requiere medición');
  else reasons.push(`${Math.round(input.cs2ContentShare30d * 100)}% del tiempo medido en CS2${contentMatches ? ': cumple' : ': inferior al 30%'}`);
  if (input.followers === null) reasons.push('Seguidores de Twitch no disponibles');
  else reasons.push(`${input.followers.toLocaleString('es-ES')} seguidores${followersMatch
    ? `: supera ${input.minimumFollowers.toLocaleString('es-ES')}`
    : `: no supera ${input.minimumFollowers.toLocaleString('es-ES')}`}`);
  if (input.viewers !== null) reasons.push(`${input.viewers.toLocaleString('es-ES')} espectadores ahora; no se usan como media`);
  reasons.push(gameMatches ? `Contenido actual: ${input.game}` : 'Categoría actual distinta de CS2; decide el histórico de 30 días');
  if (!languageMatches) reasons.push(`Idioma ${input.language || 'desconocido'} no coincide`);
  if (input.isLive) reasons.push('Canal activo ahora');
  if (isQualified) reasons.push('Revisar país y encaje legal antes de contactar');

  return {
    isQualified,
    score: normalizedScore,
    status: isQualified ? 'qualified'
      : audienceUnknown || input.cs2ContentShare30d === null || input.followers === null ? 'review' : 'rejected',
    reasons,
  };
}
