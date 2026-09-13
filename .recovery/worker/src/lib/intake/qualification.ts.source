import type { IntakeProfile } from '@/lib/schemas/creatorIntake';
import { INTAKE_INTEREST_QUESTION } from './welcome';
import { intakeMetricsRequest } from './metrics-request';

export function qualifyCreator(profile: IntakeProfile) {
  const viewers = profile.averageViewers;
  const mainKnown = viewers !== undefined && profile.streamPlatform !== undefined
    && profile.focusPercent !== undefined && profile.focusPeriodDays !== undefined;
  const main = profile.doesStream === false ? false : mainKnown && profile.focusPercent !== undefined
    ? viewers.value >= 100 && profile.focusPercent >= 30 : null;
  const tiktokKnown = profile.tiktokLive === false || profile.tiktokBattles === false
    || (profile.tiktokLive === true && profile.tiktokBattles === true && profile.tiktokAverageViewers !== undefined);
  const tiktok = tiktokKnown
    ? profile.tiktokLive === true && profile.tiktokBattles === true && (profile.tiktokAverageViewers?.value ?? -1) > 30
    : null;
  const category = main && tiktok ? 'both' : main ? 'main' : tiktok ? 'tiktok'
    : main === false && tiktok === false ? 'other' : 'pending';
  return { main, tiktok, category, verified: false };
}

export const QUALIFICATION_LABELS: Record<string, string> = {
  main: 'Foco principal', tiktok: 'TikTok LIVE', both: 'Foco principal + TikTok',
  other: 'Otras marcas', pending: 'Pendiente de datos',
};
export const GAMBLING_PREFERENCE_LABELS = { yes: 'Sí', no: 'No', discuss: 'Depende de la marca' } as const;

export function nextIntakeQuestion(profile: IntakeProfile): string | null {
  if (profile.interested === false || profile.contactType === 'brand') return null;
  if (profile.socials?.length) return profile.metricsRequested ? null : intakeMetricsRequest(profile);
  if (profile.interested === undefined) return INTAKE_INTEREST_QUESTION;
  return 'Pásame los enlaces de tus redes más activas, las que más utilizas para crear contenido.';
}
