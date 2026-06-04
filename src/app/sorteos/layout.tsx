import '../codigos/giveaways-animations.css';

import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import { absoluteUrl } from '@/lib/site-url';

export const metadata: Metadata = {
  title: 'Sorteos de Skins — SocialPro',
  description: 'Participa en los mejores sorteos de skins CS2 y recompensas gaming de tus creadores favoritos.',
  robots: { index: true, follow: true },
  alternates: {
    languages: {
      es: absoluteUrl('/sorteos'),
      en: absoluteUrl('/codigos'),
      'x-default': absoluteUrl('/sorteos'),
    },
  },
};

export default function SorteosLayout({ children }: { children: ReactNode }): React.JSX.Element {
  return (
    <div
      className="min-h-screen text-white font-sans relative overflow-x-hidden"
      style={{ background: '#09090f' }}
    >
      {/* Animated background blobs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden>
        <div className="gw-bg-blob gw-bg-blob-purple" />
        <div className="gw-bg-blob gw-bg-blob-orange" />
        <div className="gw-bg-blob gw-bg-blob-pink" />
      </div>
      <div className="relative z-10">{children}</div>
    </div>
  );
}
