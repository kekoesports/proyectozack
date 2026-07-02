import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import { Rajdhani, Chakra_Petch, Pacifico } from 'next/font/google';

import './platform.css';
import './platform-brand-cards.css';

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

const pacifico = Pacifico({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-pacifico',
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
    <div className={`giveaway-platform ${chakra.variable} ${rajdhani.variable} ${pacifico.variable}`}>
      {children}
    </div>
  );
}
