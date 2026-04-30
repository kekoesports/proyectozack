import Link from 'next/link';
import type { ReactNode } from 'react';

type StatCardProps = {
  readonly label: string;
  readonly value: string | number;
  readonly description: string;
  readonly trend?: number | undefined;
  readonly trendLabel?: string;
  readonly icon: ReactNode;
  readonly accent: string;
  readonly href?: string;
  readonly isMock?: boolean;
};

export function StatCard({
  label,
  value,
  description,
  trend,
  trendLabel = 'vs sem. anterior',
  icon,
  accent,
  href = '#',
  isMock = false,
}: StatCardProps): React.ReactElement {
  const trendPositive = trend !== undefined && trend > 0;
  const trendNegative = trend !== undefined && trend < 0;
  const trendNeutral  = trend !== undefined && trend === 0;

  return (
    <Link
      href={href}
      prefetch={false}
      className="group flex flex-col rounded-lg bg-sp-admin-card overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.06)] hover:shadow-[0_3px_12px_rgba(0,0,0,0.09)] transition-all duration-200"
    >
      <div className="h-[2px] w-full shrink-0" style={{ background: accent }} />

      <div className="flex items-center gap-3 px-4 py-3">
        {/* Icon */}
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: `${accent}14`, color: accent }}
        >
          <span className="w-3.5 h-3.5">{icon}</span>
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-sp-admin-muted leading-none truncate">
            {label}{isMock && <span className="text-sp-admin-muted/40 ml-1 normal-case tracking-normal">·&nbsp;est.</span>}
          </p>
          <p className="text-[20px] font-bold text-sp-admin-text tabular-nums leading-tight mt-0.5">
            {value}
          </p>
          <p className="text-[9px] text-sp-admin-muted leading-none mt-0.5 truncate">{description}</p>
        </div>

        {/* Trend */}
        {trend !== undefined && (
          <div className={`text-[10px] font-semibold shrink-0 ${
            trendPositive ? 'text-emerald-600' :
            trendNegative ? 'text-red-500' :
            'text-sp-admin-muted'
          }`}>
            {trendPositive ? '↑' : trendNegative ? '↓' : '→'}{' '}
            {trendNeutral ? '0%' : `${Math.abs(trend)}%`}
          </div>
        )}
      </div>
    </Link>
  );
}
