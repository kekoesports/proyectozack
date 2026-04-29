import type { ReactNode } from 'react';

export type Tone = 'success' | 'warning' | 'danger' | 'neutral' | 'info';
type Variant = 'soft' | 'solid' | 'dot';

type Props = {
  readonly tone: Tone;
  readonly variant?: Variant;
  readonly children: ReactNode;
};

const TONE_VARS: Record<Tone, { color: string; bg: string }> = {
  success: {
    color: 'var(--color-sp-success)',
    bg: 'var(--color-sp-success-bg)',
  },
  warning: {
    color: 'var(--color-sp-warning)',
    bg: 'var(--color-sp-warning-bg)',
  },
  danger: {
    color: 'var(--color-sp-danger)',
    bg: 'var(--color-sp-danger-bg)',
  },
  neutral: {
    color: 'var(--color-sp-neutral)',
    bg: 'var(--color-sp-neutral-bg)',
  },
  info: {
    color: 'var(--color-sp-info)',
    bg: 'var(--color-sp-info-bg)',
  },
};

const BASE = 'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium';

/**
 * Badge de estado coloreado por tono (success/warning/danger/neutral/info) con variantes `soft | solid | dot`. Usado para enums de estado (borrador, emitida, cobrada, etc.).
 *
 * @kind server
 * @feature admin/_shared
 * @example
 * ```tsx
 * <StateBadge tone="success">Cobrada</StateBadge>
 * ```
 */
export function StateBadge({ tone, variant = 'soft', children }: Props): React.ReactElement {
  const { color, bg } = TONE_VARS[tone];

  if (variant === 'solid') {
    return (
      <span
        className={BASE}
        style={{ backgroundColor: color, color: '#ffffff' }}
      >
        {children}
      </span>
    );
  }

  if (variant === 'dot') {
    return (
      <span className={`${BASE} text-sp-admin-muted`}>
        <span
          className="inline-block w-1.5 h-1.5 rounded-full flex-shrink-0"
          style={{ backgroundColor: color }}
          aria-hidden="true"
        />
        {children}
      </span>
    );
  }

  // soft (default)
  return (
    <span
      className={BASE}
      style={{ backgroundColor: bg, color }}
    >
      {children}
    </span>
  );
}
