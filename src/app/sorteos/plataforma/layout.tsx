import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import Image from 'next/image';
import { Rajdhani, Chakra_Petch } from 'next/font/google';

import './platform.css';
import './platform-hero.css';
import './platform-brand-cards.css';
import './platform-fx.css';
import './platform-widgets.css';
import './platform-keydrop.css';

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

/**
 * Override del metadata heredado de /sorteos.
 * PR1: `noindex` mientras no cerremos Steam auth (decisión aprobada).
 */
export const metadata: Metadata = {
  title: 'Plataforma de Sorteos | SocialPro',
  description:
    'Participa gratis en los sorteos de nuestros creadores, gana monedas con misiones y recompensas diarias y canjéalas por skins de CS2, merchandising y tarjetas regalo.',
  robots: { index: false, follow: false },
};

export default function PlataformaLayout({ children }: { children: ReactNode }): React.JSX.Element {
  return (
    <div className={`giveaway-platform ${chakra.variable} ${rajdhani.variable}`}>
      {/* Agentes decorativos en los laterales (desktop >= 1400px). */}
      {/* Reutilizamos los assets de KeyDrop y Skin.Club — mismos personajes CS2. */}
      <Image
        src="/images/agents/terrorist-cs2.png"
        alt=""
        aria-hidden
        width={900}
        height={1717}
        className="gp-sidekick gp-sidekick-left"
        priority={false}
      />
      <Image
        src="/images/agents/skinclub-agent.png"
        alt=""
        aria-hidden
        width={512}
        height={512}
        className="gp-sidekick gp-sidekick-right"
        priority={false}
      />
      {children}
    </div>
  );
}
