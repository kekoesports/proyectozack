import './giveaways-animations.css';

import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import { absoluteUrl } from '@/lib/site-url';

export const metadata: Metadata = {
  title: 'Giveaways — SocialPro',
  description: 'Sorteos activos de los creadores de SocialPro',
  robots: { index: true, follow: true },
  alternates: {
    languages: {
      en: absoluteUrl('/giveaways'),
      es: absoluteUrl('/sorteos'),
      'x-default': absoluteUrl('/sorteos'),
    },
  },
};

export default function GiveawaysLayout({ children }: { children: ReactNode }) {
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
