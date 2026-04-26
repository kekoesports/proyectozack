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
    <div
      className="min-h-screen text-white font-sans"
      style={{
        background:
          'radial-gradient(ellipse 80% 50% at 15% -5%, rgba(139,58,173,0.12) 0%, transparent 55%), radial-gradient(ellipse 60% 40% at 85% 110%, rgba(245,99,42,0.08) 0%, transparent 55%), #09090f',
      }}
    >
      <div className="relative z-10">{children}</div>
    </div>
  );
}
