import type { CSSProperties } from 'react';

type Variant = 'text' | 'card' | 'row' | 'circle';

type Props = {
  readonly variant?: Variant;
  readonly count?: number;
  readonly className?: string;
  readonly width?: number | string;
  readonly height?: number | string;
};

const BASE = 'animate-pulse rounded-md bg-sp-admin-border/40';

const VARIANT_DEFAULTS: Record<Variant, { width: string; height: string }> = {
  text: { width: '100%', height: '0.75rem' },
  card: { width: '100%', height: '6rem' },
  row: { width: '100%', height: '2.5rem' },
  circle: { width: '2.5rem', height: '2.5rem' },
};

/**
 * Skeleton de carga con variantes `text | card | row | circle` y soporte para múltiples instancias vía `count`.
 *
 * @kind server
 * @feature admin/_shared
 * @example
 * ```tsx
 * <Skeleton variant="row" count={5} />
 * ```
 */
export function Skeleton({
  variant = 'text',
  count = 1,
  className,
  width,
  height,
}: Props): React.ReactElement {
  const defaults = VARIANT_DEFAULTS[variant];
  const style: CSSProperties = {
    width: width ?? defaults.width,
    height: height ?? defaults.height,
    ...(variant === 'circle' ? { borderRadius: '9999px' } : {}),
  };

  if (count === 1) {
    return <div className={`${BASE} ${className ?? ''}`} style={style} aria-hidden="true" />;
  }

  return (
    <div className="flex flex-col gap-2" aria-hidden="true">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className={`${BASE} ${className ?? ''}`} style={style} />
      ))}
    </div>
  );
}

type TableSkeletonProps = {
  readonly rows?: number;
  readonly columns?: number;
};

export function TableSkeleton({ rows = 5, columns = 4 }: TableSkeletonProps): React.ReactElement {
  return (
    <div className="rounded-2xl border border-sp-admin-border bg-sp-admin-card overflow-hidden" aria-hidden="true">
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div
          key={rowIndex}
          className="grid items-center gap-3 border-b border-sp-admin-border/60 px-5 py-3 last:border-0"
          style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: columns }).map((__, colIndex) => (
            <Skeleton key={colIndex} variant="text" height={colIndex === 0 ? '1rem' : '0.75rem'} />
          ))}
        </div>
      ))}
    </div>
  );
}
