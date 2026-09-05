/** Internal, versioned rubric. Call with provider data only after the usage gate. */
export type CreatorFitEvidence = Readonly<{
  contentMatch: boolean | null;
  audience: number | null;
  targetAudience: number;
  activityConfirmed: boolean | null;
  growthPercent: number | null;
  marketMatch: boolean | null;
  professionalContact: boolean | null;
  brandReviewedMatch: boolean | null;
}>;

export type CreatorScoreComponent = Readonly<{ key: string; earned: number; max: number; reason: string }>;
export const CREATOR_FIT_SCORE_VERSION = 'socialpro-evidence-1';

export function scoreCreatorFit(input: CreatorFitEvidence): {
  score: number; reasons: string[]; breakdown: CreatorScoreComponent[]; version: string;
} {
  const binary = (key: string, max: number, value: boolean | null, yes: string): CreatorScoreComponent => ({
    key, max, earned: value === true ? max : 0,
    reason: value === null ? 'Dato no disponible / revisión pendiente' : value ? yes : 'No coincide con el criterio',
  });
  const audienceKnown = input.audience !== null && Number.isFinite(input.audience) && input.audience >= 0;
  const audience = audienceKnown && input.audience !== null && input.targetAudience > 0
    ? Math.min(20, Math.floor(20 * input.audience / input.targetAudience)) : 0;
  const growthKnown = input.growthPercent !== null && Number.isFinite(input.growthPercent);
  const growth = growthKnown && input.growthPercent !== null
    ? Math.max(0, Math.min(15, Math.floor(input.growthPercent * 0.5))) : 0;
  const breakdown = [
    binary('CONTENT FIT', 25, input.contentMatch, 'Contenido compatible con el perfil'),
    { key: 'AUDIENCE', max: 20, earned: audience, reason: audienceKnown
      ? `${input.audience} observados; objetivo ${input.targetAudience}. No equivale a una audiencia mensual.` : 'Audiencia no disponible; no se sustituye por cero' },
    binary('ACTIVITY', 15, input.activityConfirmed, 'Actividad reciente verificada'),
    { key: 'GROWTH', max: 15, earned: growth, reason: growthKnown
      ? `${input.growthPercent}% entre observaciones comparables autorizadas` : 'Sin histórico comparable autorizado; crecimiento no calculado' },
    binary('MARKET', 10, input.marketMatch, 'Encaja con el mercado del perfil; no acredita legalidad de gambling'),
    binary('CONTACTABILITY', 5, input.professionalContact, 'Contacto profesional público verificado'),
    binary('BRAND FIT', 10, input.brandReviewedMatch, 'Compatibilidad con marca revisada por una persona'),
  ];
  return { score: breakdown.reduce((sum, item) => sum + item.earned, 0), breakdown,
    reasons: [`Score interno ${CREATOR_FIT_SCORE_VERSION}; desconocido no significa descartado.`,
      ...breakdown.map((item) => `${item.key} ${item.earned}/${item.max}: ${item.reason}`)], version: CREATOR_FIT_SCORE_VERSION };
}
