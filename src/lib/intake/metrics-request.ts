import type { IntakeProfile } from '@/lib/schemas/creatorIntake';

const INTRO = 'Gracias por compartir tus redes. Para valorar bien tu perfil, envíanos capturas o un informe de las estadísticas de los últimos 30 días:';
const REQUESTS = {
  twitch: 'Twitch: stats de los últimos 30 días y GEO stats.',
  kick: 'Kick: stats de los últimos 30 días y GEO stats.',
  instagram: 'Instagram: visualizaciones de historias y reels, dentro de las estadísticas de contenido, y GEO stats (países de tu audiencia).',
  youtube: 'YouTube: visualizaciones del contenido y GEO stats (países de tu audiencia).',
  tiktok: 'TikTok: visualizaciones del contenido y países de tu audiencia; si haces LIVE, incluye también las estadísticas de tus directos.',
  other: 'Tus otras redes: estadísticas de contenido y países de tu audiencia.',
};

export function intakeMetricsRequest(profile: IntakeProfile): string {
  const platforms = [...new Set(profile.socials?.map((social) => social.platform) ?? [])];
  const lines = (platforms.length ? platforms : ['twitch', 'kick', 'instagram', 'youtube'] as const)
    .map((platform) => `• ${REQUESTS[platform]}`);
  return [INTRO, lines.join('\n'), 'Puedes enviarlo por aquí en varios mensajes. Con esta información podremos valorar bien tu perfil y un compañero de SocialPro continuará contigo.'].join('\n\n');
}

export function isIntakeMetricsRequest(text?: string): boolean {
  return text?.includes(INTRO) ?? false;
}
