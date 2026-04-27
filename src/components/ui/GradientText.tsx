
import type { ReactNode } from 'react';

type GradientTextProps = {
  children: ReactNode;
  className?: string;
}

/**
 * Span que aplica el gradiente de marca al texto vía la clase `.gradient-text`
 * definida en `globals.css`.
 *
 * @kind server
 * @feature ui
 * @example
 * ```tsx
 * <GradientText>SocialPro</GradientText>
 * ```
 */
export function GradientText({ children, className = '' }: GradientTextProps) {
  return (
    <span className={`gradient-text ${className}`}>
      {children}
    </span>
  );
}
