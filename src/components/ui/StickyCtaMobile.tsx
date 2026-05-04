'use client';

import { useEffect, useState } from 'react';
import { TrackedCtaLink } from './TrackedCtaLink';

type Props = {
  readonly href: string;
  readonly label: string;
  readonly ctaId: string;
};

/**
 * CTA sticky bottom para mobile. Aparece tras 400px de scroll y
 * desaparece cuando el usuario vuelve arriba. Sólo visible en mobile
 * (`md:hidden`) — en desktop el CTA principal del hero es suficiente.
 *
 * Usa `<TrackedCtaLink>` para emitir `cta_click` con el `ctaId` específico
 * de la landing donde se monta.
 *
 * @kind client
 * @feature ui
 */
export function StickyCtaMobile({ href, label, ctaId }: Props): React.JSX.Element {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Suscripción real a window.scroll — necesaria para detectar posición de
    // scroll fuera del modelo declarativo de React.
    const onScroll = (): void => {
      setShow(window.scrollY > 400);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div
      className={`md:hidden fixed bottom-0 left-0 right-0 z-40 px-4 pb-3 pt-3 transition-transform duration-300 ${
        show ? 'translate-y-0' : 'translate-y-full pointer-events-none'
      }`}
      style={{
        background: 'linear-gradient(to top, rgba(11,11,12,0.97) 0%, rgba(11,11,12,0.85) 70%, rgba(11,11,12,0) 100%)',
        backdropFilter: 'blur(8px)',
      }}
      aria-hidden={!show}
    >
      <TrackedCtaLink
        href={href}
        ctaId={ctaId}
        className="block w-full py-3 text-center font-display font-bold text-white text-sm uppercase tracking-wider bg-sp-grad rounded-full shadow-lg"
      >
        {label}
      </TrackedCtaLink>
    </div>
  );
}
