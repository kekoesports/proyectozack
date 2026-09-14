import type { IntakeProfile } from '@/lib/schemas/creatorIntake';
import { GAMBLING_PREFERENCE_LABELS, QUALIFICATION_LABELS } from './qualification';

export function intakeAlertSummary(profile: IntakeProfile, category: string): string {
  const average = profile.averageViewers;
  const tiktok = profile.tiktokAverageViewers;
  const preferences = profile.gamblingPreferences;
  const preference = (value: 'yes' | 'no' | 'discuss' | undefined) => value ? GAMBLING_PREFERENCE_LABELS[value] : 'Pendiente';
  return [
    `Captación · ${profile.name ?? 'Nuevo creador'} · ${QUALIFICATION_LABELS[category] ?? 'Revisar perfil'}`,
    `Media en directo: ${average ? `${average.value} (${average.periodDays} días)` : 'pendiente'}.`,
    `Contenido CS2/casino: ${profile.focusPercent === undefined ? 'pendiente' : `${profile.focusPercent}%`}.`,
    `Interés: casinos ${preference(preferences?.casinos)}; apuestas ${preference(preferences?.sportsBetting)}; gambling CS2 ${preference(preferences?.cs2Gambling)}.`,
    `TikTok LIVE: ${profile.tiktokLive === false ? 'no realiza directos' : tiktok ? `${tiktok.value} de media (${tiktok.periodDays} días)` : 'media pendiente'}.`,
    'Datos declarados. Abre la ficha para ver las redes, el motivo y el historial; continúa desde la conversación original.',
  ].join('\n');
}
