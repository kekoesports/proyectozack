'use client';

import { useEffect } from 'react';
import type { ReactNode } from 'react';

/**
 * Layout para páginas en inglés (/en, /talents, /services, /cases, /contact).
 * Cambia el atributo lang del <html> raíz de "es" a "en" mientras la ruta EN está activa.
 * El root layout tiene lang="es" — este layout lo sobreescribe en el DOM.
 */
export default function EnLayout({ children }: { children: ReactNode }): React.JSX.Element {
  useEffect(() => {
    const prev = document.documentElement.lang;
    document.documentElement.lang = 'en';
    return () => { document.documentElement.lang = prev; };
  }, []);

  return <>{children}</>;
}
