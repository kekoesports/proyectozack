import Link from 'next/link';
import type { ReactNode } from 'react';

type StatBadge = {
  readonly label: string;
  readonly value: string | number;
  readonly accent?: string;
};

type ActionBtn = {
  readonly label: string;
  readonly href: string;
  readonly primary?: boolean;
  readonly icon?: ReactNode;
};

type AdminPageHeaderProps = {
  readonly title: string;
  readonly subtitle?: string;
  readonly stats?: readonly StatBadge[];
  readonly actions?: readonly ActionBtn[];
};

export function AdminPageHeader({
  title,
  subtitle,
  stats,
  actions,
}: AdminPageHeaderProps): React.ReactElement {
  return (
    <div className="flex items-start justify-between gap-4 mb-4 flex-wrap">
      <div className="flex items-baseline gap-3 flex-wrap">
        <h1 className="text-xl font-bold text-sp-admin-text leading-none">{title}</h1>

        {/* Stat badges */}
        {stats && stats.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            {stats.map((s) => (
              <span
                key={s.label}
                className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-sp-admin-muted"
              >
                {s.accent && (
                  <span
                    className="inline-block w-1.5 h-1.5 rounded-full"
                    style={{ background: s.accent }}
                  />
                )}
                <span className="tabular-nums font-bold text-sp-admin-text">{s.value}</span>
                {s.label}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        {/* Subtitle (right side) */}
        {subtitle && !actions?.length && (
          <span className="text-[10px] text-sp-admin-muted capitalize">{subtitle}</span>
        )}

        {/* Action buttons */}
        {actions?.map((a) => (
          <Link
            key={a.href}
            href={a.href}
            prefetch={false}
            className={`inline-flex items-center gap-1.5 text-[12px] font-semibold px-3 py-1.5 rounded-lg transition-colors ${
              a.primary
                ? 'bg-sp-admin-accent text-white hover:bg-sp-admin-accent/90'
                : 'border border-sp-admin-border text-sp-admin-muted hover:text-sp-admin-text hover:bg-sp-admin-hover'
            }`}
          >
            {a.icon && <span className="w-3.5 h-3.5">{a.icon}</span>}
            {a.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
