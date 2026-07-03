import type { ReactNode } from 'react';
import type { Metadata } from 'next';

/**
 * Legacy layout de `/sorteos/plataforma/*`. Todas las rutas de este
 * segmento son redirects a `/sorteos` o `/sorteos/[slug]`, por lo que
 * el shell y los CSS ya no se cargan aquí — heredan del layout raíz
 * `/sorteos/layout.tsx`.
 *
 * Metadata `noindex` para que las URLs legacy no compitan con la
 * canónica en los buscadores.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function PlataformaLegacyLayout({ children }: { children: ReactNode }): React.JSX.Element {
  return <>{children}</>;
}
