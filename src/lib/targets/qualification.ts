import type { TargetQualificationStatus } from '@/lib/schemas/target';

export type TwitchFitInput = {
  readonly followers: number | null;
  readonly viewers: number | null;
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
  const audienceMatches = (input.followers !== null && input.followers >= input.minimumFollowers)
    || (input.viewers !== null && input.viewers >= 20);
  const audienceUnknown = input.followers === null && input.viewers === null;

  let score = 0;
  if (gameMatches) score += 25;
  if (languageMatches) score += 10;
  if (input.isLive) score += 20;
  score += input.viewers !== null ? input.viewers >= 100 ? 25 : input.viewers >= 25 ? 20 : input.viewers >= 10 ? 10 : 0 : 0;
  score += input.followers !== null && input.followers >= input.minimumFollowers ? 10 : 0;
  if (input.followers !== null && input.followers > 0 && input.viewers !== null) {
    const liveEfficiency = input.viewers / input.followers;
    score += liveEfficiency >= 0.05 ? 10 : liveEfficiency >= 0.01 ? 7 : 3;
  } else if (input.viewers !== null && input.viewers >= 20) {
    score += 8;
  }

  const normalizedScore = Math.max(0, Math.min(score, 100));
  const isQualified = languageMatches
    && gameMatches
    && input.isLive === true
    && audienceMatches
    && normalizedScore >= 60;

  const reasons: string[] = [];
  if (audienceUnknown) reasons.push('Audiencia no disponible; pendiente de revisión, no equivale a cero');
  else if (input.followers !== null && input.followers >= input.minimumFollowers) reasons.push(`${input.followers.toLocaleString('es-ES')} seguidores`);
  else if (input.viewers !== null && input.viewers >= 20) reasons.push(`${input.viewers.toLocaleString('es-ES')} espectadores en directo: observación puntual, no media histórica`);
  else reasons.push(`Menos de ${input.minimumFollowers.toLocaleString('es-ES')} seguidores y 20 espectadores`);
  reasons.push(gameMatches ? `Contenido actual: ${input.game}` : 'Juego del perfil no confirmado');
  if (!languageMatches) reasons.push(`Idioma ${input.language || 'desconocido'} no coincide`);
  if (input.isLive) reasons.push('Canal activo ahora');
  if (isQualified) reasons.push('Revisar país y encaje legal antes de contactar');

  return {
    isQualified,
    score: normalizedScore,
    status: isQualified || audienceUnknown ? 'review' : 'rejected',
    reasons,
  };
}
