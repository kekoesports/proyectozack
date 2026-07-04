import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import { Rajdhani, Chakra_Petch } from 'next/font/google';
import { absoluteUrl } from '@/lib/site-url';

// CSS de la plataforma — cargados una vez para todas las rutas hijas.
import './plataforma/platform.css';
import './plataforma/platform-dropdown.css';
import './plataforma/platform-hero.css';
import './plataforma/platform-brand-cards.css';
import './plataforma/platform-brand-csgo.css';
import './plataforma/platform-brand-leds.css';
import './plataforma/platform-fx.css';
import './plataforma/platform-widgets.css';
import './plataforma/platform-rewards-upcoming.css';
import './plataforma/platform-missions-yt-placeholder.css';
import './plataforma/platform-discord-mission.css';
import './plataforma/platform-external-giveaways.css';
import './plataforma/platform-profile.css';
import './plataforma/platform-creator-profile.css';
import './plataforma/platform-steam-avatar.css';
import './plataforma/platform-mini-placeholders.css';
import './plataforma/platform-legal.css';
import './plataforma/platform-steam-login.css';
// Ajustes responsive mobile — se carga al final para que los breakpoints
// sobreescriban las reglas base sin depender de `!important`.
import './plataforma/platform-mobile-responsive.css';
import './sorteos-index.css';

const rajdhani = Rajdhani({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-rajdhani',
  display: 'swap',
});

const chakra = Chakra_Petch({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-chakra',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Sorteos y recompensas de creadores | SocialPro',
  description:
    'Índice público de SocialPro Giveaways. Elige un creador y participa gratis en sus sorteos, gana puntos y canjea recompensas.',
  robots: { index: true, follow: true },
  alternates: { canonical: absoluteUrl('/sorteos') },
};

export default function SorteosLayout({ children }: { children: ReactNode }): React.JSX.Element {
  return (
    <div className={`${chakra.variable} ${rajdhani.variable}`}>
      {children}
    </div>
  );
}
