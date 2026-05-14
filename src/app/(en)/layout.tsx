import type { ReactNode } from 'react';

/**
 * Layout para páginas en inglés (/en, /talents, /services, /cases, /contact).
 * Aplica lang="en" a nivel de contenedor server-side, visible para Googlebot.
 * Nota: el atributo <html lang> requeriría un root layout separado para el
 * grupo (en); esta solución es la mejor aproximación sin reestructurar el
 * app directory. El hreflang en sitemap.ts es la señal primaria para Google.
 */
export default function EnLayout({ children }: { children: ReactNode }): React.JSX.Element {
  return <div lang="en">{children}</div>;
}
