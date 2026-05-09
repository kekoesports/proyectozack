import Image from 'next/image';

type Tone = 'on-dark' | 'on-light';
type Size = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

const SIZE_CLASS: Record<Size, string> = {
  xs: 'max-h-4',   // 16px — chips diminutos
  sm: 'max-h-5',   // 20px — sidebar pequeño
  md: 'max-h-7',   // 28px — sidebar lista, card mini
  lg: 'max-h-9',   // 36px — carrusel landing
  xl: 'max-h-12',  // 48px — case header
};

type Props = {
  readonly src: string;
  readonly alt: string;
  /** Aplica filtro silueta sobre fondo oscuro (default) o claro. */
  readonly tone?: Tone;
  /** Altura máxima visual normalizada — los anchos se mantienen proporcionalmente. */
  readonly size?: Size;
  /** Si false, renderiza con color original (sin filtro monocromo). */
  readonly mono?: boolean;
  readonly width?: number;
  readonly height?: number;
  readonly className?: string;
  readonly priority?: boolean;
};

/**
 * Logo de marca con tratamiento editorial unificado.
 *
 * - Default `mono=true`: silueta blanca (on-dark) o gris (on-light) al ~50-65% opacity
 * - Hover sobre el logo o sobre `.group` ancestral: revela color original a 100%
 * - Tamaños normalizados (xs..xl) → consistencia visual entre carrusel, sidebars y cards
 *
 * @kind server
 */
export function BrandLogo({
  src,
  alt,
  tone = 'on-dark',
  size = 'md',
  mono = true,
  width = 160,
  height = 48,
  className,
  priority = false,
}: Props) {
  const monoClass = mono ? `brand-logo brand-logo--${tone}` : '';
  const cls = ['object-contain w-auto', SIZE_CLASS[size], monoClass, className]
    .filter(Boolean)
    .join(' ');

  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      priority={priority}
      className={cls}
    />
  );
}
