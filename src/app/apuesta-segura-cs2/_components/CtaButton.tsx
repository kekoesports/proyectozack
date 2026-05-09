import { TrackedCtaLink } from '@/components/ui/TrackedCtaLink';
import type { ReactNode } from 'react';

type Variant = 'primary' | 'outline' | 'dark' | 'ghost';

const baseClass =
  'inline-flex items-center justify-center gap-2 font-display font-bold uppercase tracking-wider text-sm px-7 py-3.5 rounded-full transition-all duration-200';

const variantClass: Record<Variant, string> = {
  primary:
    'bg-sp-grad text-white shadow-[0_10px_30px_-10px_rgba(224,48,112,0.5)] hover:shadow-[0_18px_42px_-10px_rgba(224,48,112,0.7)] hover:-translate-y-0.5',
  outline:
    'border border-white/15 text-white/90 hover:border-white/30 hover:bg-white/[0.04]',
  dark:
    'bg-sp-black text-white border border-sp-black hover:bg-sp-dark',
  ghost: 'text-white/70 hover:text-white',
};

type Props = {
  readonly href: string;
  readonly ctaId: string;
  readonly variant?: Variant;
  readonly external?: boolean;
  readonly children: ReactNode;
  readonly className?: string;
};

export function CtaButton({
  href,
  ctaId,
  variant = 'primary',
  external = false,
  children,
  className = '',
}: Props) {
  return (
    <TrackedCtaLink
      href={href}
      ctaId={ctaId}
      className={`${baseClass} ${variantClass[variant]} ${className}`}
      {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
    >
      {children}
    </TrackedCtaLink>
  );
}
