import { TwitchLanding } from '@/features/twitch/TwitchLanding';
import { twitchMetadata } from '@/features/twitch/landing-content';

export const revalidate = 3600;
export const metadata = twitchMetadata('es');

export default function AgenciaStreamersTwitchPage() {
  return <TwitchLanding locale="es" />;
}
