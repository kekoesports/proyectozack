import type { ReactNode } from 'react';
import Image from 'next/image';

/**
 * Shell dark de las páginas de SocialPro Giveaways.
 * Aplica el wrapper `.giveaway-platform` (donde viven todos los CSS
 * scoped) y monta los agentes decorativos laterales.
 *
 * Cualquier página bajo /sorteos/* que quiera pintar con el shell dark
 * debe montarse dentro de este componente.
 */
export function PlatformShell({ children }: { children: ReactNode }) {
  return (
    <div className="giveaway-platform">
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
