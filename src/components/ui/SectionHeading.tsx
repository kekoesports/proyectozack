
import type { ReactNode } from 'react';

type SectionHeadingProps = {
  children: ReactNode;
  className?: string;
}

/**
 * Encabezado `<h2>` con la tipografía display de la marca para títulos de
 * sección en la web pública.
 *
 * @kind server
 * @feature ui
 * @example
 * ```tsx
 * <SectionHeading>Nuestros talentos</SectionHeading>
 * ```
 */
export function SectionHeading({ children, className = '' }: SectionHeadingProps) {
  return (
    <h2
      className={`font-display text-4xl md:text-5xl font-black uppercase tracking-tight text-sp-dark leading-tight ${className}`}
    >
      {children}
    </h2>
  );
}
