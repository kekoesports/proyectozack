'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { TrackedCtaLink } from './TrackedCtaLink';

type Props = {
  readonly href: string;
  readonly label: string;
  readonly ctaId: string;
  readonly external?: boolean;
  readonly iconSrc?: string;
  readonly iconAlt?: string;
};

/**
 * CTA sticky bottom para mobile. Aparece tras 400px de scroll y
 * desaparece cuando el usuario vuelve arriba. Sólo visible en mobile
 * (`md:hidden`) — en desktop el CTA principal del hero es suficiente.
 *
 * Usa `<TrackedCtaLink>` para emitir `cta_click` con el `ctaId` específico
 * de la landing donde se monta. Soporta opcional `iconSrc` para mostrar
 * un avatar/badge a la izquierda del label, dando identidad de marca al
 * sticky sin agrandar el componente.
 *
 * @kind client
 * @feature ui
 */
export function StickyCtaMobile({
  href,
  label,
  ctaId,
  external = false,
  iconSrc,
  iconAlt,
}: Props): React.JSX.Element {
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
        className={`flex items-center justify-center gap-2.5 w-full ${iconSrc ? 'pl-1.5 pr-5 py-1.5' : 'py-3'} text-center font-display font-bold text-white text-sm uppercase tracking-wider bg-sp-grad rounded-full shadow-lg`}
        {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      >
        {iconSrc ? (
          <span className="flex-none w-9 h-9 rounded-full overflow-hidden ring-1 ring-white/20 bg-sp-black">
            <Image
              src={iconSrc}
              alt={iconAlt ?? ''}
              width={36}
              height={36}
              className="w-full h-full object-cover"
            />
          </span>
        ) : null}
        <span>{label}</span>
      </TrackedCtaLink>
    </div>
  );
}
