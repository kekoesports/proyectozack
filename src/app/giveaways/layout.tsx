import './giveaways-animations.css';

import type { ReactNode } from 'react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Giveaways — SocialPro',
  description: 'Sorteos activos de los creadores de SocialPro',
  robots: { index: true, follow: true },
};

export default function GiveawaysLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-sp-black text-white font-sans">
      <div className="relative z-10">{children}</div>
    </div>
  );
}
