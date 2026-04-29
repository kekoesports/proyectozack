import type { ReactNode } from 'react';
import type { Tone } from './StateBadge';

type Props = {
  readonly title: string;
  readonly value: string | number;
  readonly subtitle?: string;
  readonly tone?: Tone;
  readonly href?: string;
  readonly icon?: ReactNode;
};

const TONE_COLOR: Record<Tone, string> = {
  success: 'var(--color-sp-success)',
  warning: 'var(--color-sp-warning)',
  danger: 'var(--color-sp-danger)',
  neutral: 'var(--color-sp-neutral)',
  info: 'var(--color-sp-info)',
};

const CARD_BASE = 'rounded-lg border border-sp-admin-border bg-sp-admin-card overflow-hidden';

function CardBody({
  title,
  value,
  subtitle,
  tone,
  icon,
}: {
  readonly title: string;
  readonly value: string | number;
  readonly subtitle: string | undefined;
  readonly tone: Tone | undefined;
  readonly icon: ReactNode | undefined;
}): React.ReactElement {
  const accentColor = tone !== undefined ? TONE_COLOR[tone] : 'var(--color-sp-admin-accent)';
  return (
    <div className="flex flex-col gap-2 p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wider text-sp-admin-muted">{title}</p>
        {icon !== undefined && (
          <span className="text-sp-admin-muted" aria-hidden="true">
            {icon}
          </span>
        )}
      </div>
      <p
        className="text-2xl font-bold leading-none"
        style={{ color: accentColor }}
      >
        {value}
      </p>
      {subtitle !== undefined && (
        <p className="text-xs text-sp-admin-muted">{subtitle}</p>
      )}
    </div>
  );
}

/**
 * Card de KPI (título, valor, subtítulo y tono) opcionalmente clicable como enlace.
 *
 * @kind server
 * @feature admin/_shared
 * @example
 * ```tsx
 * <KpiCard title="Ingresos" value="12.430 €" subtitle="+8% vs mes anterior" tone="success" href="/admin/pnl" />
 * ```
 */
export function KpiCard({ title, value, subtitle, tone, href, icon }: Props): React.ReactElement {
  const body = (
    <CardBody
      title={title}
      value={value}
      subtitle={subtitle}
      tone={tone}
      icon={icon}
    />
  );

  if (href !== undefined) {
    return (
      <a
        href={href}
        className={`${CARD_BASE} block transition-colors hover:border-sp-admin-accent hover:bg-sp-admin-hover focus:outline-none focus:ring-1 focus:ring-sp-admin-accent`}
      >
        {body}
      </a>
    );
  }

  return <div className={CARD_BASE}>{body}</div>;
}
