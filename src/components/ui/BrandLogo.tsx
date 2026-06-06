import Image from 'next/image';
import type { BrandBg } from './brand-bg-map';

type Plate = BrandBg | 'none';
type Size = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
/**
 * Presencia visual interna del logo en el plate. Solo afecta `max-h` —
 * el plate mantiene su altura uniforme.
 *  - `shrink`: artwork muy ancho (JUGABET, SKIN.PLACE, 1XBET) que ocupa
 *              demasiado espacio horizontal → bajamos un peldaño.
 *  - `normal`: default.
 *  - `boost`:  artwork cuadrado/bajo-aspect (1WIN, SKIN.CLUB) que rinde
 *              proporcionalmente más pequeño → subimos un peldaño.
 */
type Presence = 'shrink' | 'normal' | 'boost';

/**
 * Dimensiones del plate: altura fija + padding horizontal adaptativo. El ancho
 * se ajusta al aspect ratio natural del logo, lo que evita recortes en logos
 * anchos (KEYDROP, SKINSMONKEY) y squashing en logos cuadrados (JUGABET,
 * SKINCLUB). La altura uniforme garantiza ritmo vertical consistente en
 * carruseles y headers.
 */
const PLATE_DIM: Record<Size, string> = {
  xs: 'h-6 px-2',
  sm: 'h-8 px-2.5',
  md: 'h-10 px-3',
  lg: 'h-14 px-4',
  xl: 'h-16 px-5',
};

/**
 * Tabla de `max-h` por tamaño y presencia. La columna `normal` es el
 * default; `shrink` baja un peldaño modesto y `boost` sube uno
 * generoso. Solo afecta el logo — el plate mantiene altura uniforme.
 */
const LOGO_MAX_HEIGHT: Record<Presence, Record<Size, string>> = {
  shrink: {
    xs: 'max-h-3',
    sm: 'max-h-4',
    md: 'max-h-6',
    lg: 'max-h-9',
    xl: 'max-h-10',
  },
  normal: {
    xs: 'max-h-3.5',
    sm: 'max-h-5',
    md: 'max-h-7',
    lg: 'max-h-10',
    xl: 'max-h-12',
  },
  boost: {
    xs: 'max-h-4',
    sm: 'max-h-6',
    md: 'max-h-8',
    lg: 'max-h-12',
    xl: 'max-h-14',
  },
};

const PLATE_BG: Record<Plate, string> = {
  light: 'bg-white',
  // Solid dark card. Sobre secciones light (carrusel home) actúa como
  // "card oscura" que destaca para logos con artwork blanco/claro
  // (KEYDROP, SKINSMONKEY). Sobre secciones dark (CaseCard header) se
  // funde con el fondo sin romper la composición — el logo se ve igual.
  dark: 'bg-sp-dark',
  none: '',
};

const PLATE_RADIUS: Record<Size, string> = {
  xs: 'rounded',
  sm: 'rounded-md',
  md: 'rounded-md',
  lg: 'rounded-lg',
  xl: 'rounded-lg',
};

type Props = {
  readonly src: string;
  readonly alt: string;
  /**
   * Fondo del plate sobre el que se renderiza el logo.
   *  - `light`: plate blanco — default, sirve para logos en color/oscuros.
   *  - `dark`:  plate oscuro — para logos con artwork blanco que serían invisibles en blanco.
   *  - `none`:  sin plate — el logo se renderiza directamente sobre el contenedor padre.
   */
  readonly plate?: Plate;
  /** Tamaño del plate y altura máxima del logo dentro. */
  readonly size?: Size;
  /**
   * Presencia visual del logo dentro del plate. Solo modula `max-h` interno;
   * el plate mantiene altura uniforme.
   */
  readonly presence?: Presence;
  readonly width?: number;
  readonly height?: number;
  readonly className?: string;
  /** Clases extra aplicadas solo al elemento <Image> (ej. "brightness-0 invert"). */
  readonly imageClassName?: string | undefined;
  readonly priority?: boolean;
};

/**
 * Logo de marca presentado sobre un plate de fondo claro u oscuro.
 *
 * Diseñado para integrar logos de calidad heterogénea (color, texto en blanco,
 * con/sin transparencia) en una presentación visual uniforme:
 *
 *  - El plate provee fondo legible para el artwork del logo.
 *  - La altura del plate y el `max-h` interno garantizan altura visual uniforme.
 *  - El logo mantiene su aspect ratio natural (`object-contain`, `w-auto`).
 *  - SVG se sirve sin optimización (next/image bloquea SVG por defecto).
 *
 * @kind server
 */
export function BrandLogo({
  src,
  alt,
  plate = 'light',
  size = 'md',
  presence = 'normal',
  width = 240,
  height = 60,
  className,
  imageClassName,
  priority = false,
}: Props): React.JSX.Element {
  const maxH = LOGO_MAX_HEIGHT[presence][size];
  // unoptimized para TODOS los logos: next/image resize destruye aspect ratio
  // de logos no-4:1 (KEYDROP 16:9 quedaba estirado, JUGABET 1:1 quedaba squished
  // al canvas del archivo). Usar el asset nativo + object-contain garantiza
  // que el aspect ratio del archivo se respete.
  const img = (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      priority={priority}
      unoptimized
      className={['object-contain w-auto max-w-full', maxH, imageClassName].filter(Boolean).join(' ')}
    />
  );

  if (plate === 'none') {
    return (
      <span className={`inline-flex items-center ${className ?? ''}`}>
        {img}
      </span>
    );
  }

  return (
    <span
      className={[
        'inline-flex items-center justify-center shrink-0',
        PLATE_DIM[size],
        PLATE_RADIUS[size],
        PLATE_BG[plate],
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {img}
    </span>
  );
}
