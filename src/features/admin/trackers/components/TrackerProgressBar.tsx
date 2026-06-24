type Props = {
  current: number;
  target: number;
  status: string;
};

export function TrackerProgressBar({ current, target, status }: Props) {
  const pct = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;

  const barColor =
    status === 'review_pending' || status === 'approved' || status === 'paid'
      ? 'bg-emerald-500'
      : status === 'cancelled'
      ? 'bg-sp-muted'
      : pct >= 80
      ? 'bg-sp-orange'
      : 'bg-sp-blue';

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs font-semibold">
        <span className="text-sp-dark">{current} / {target}</span>
        <span className="text-sp-muted">{pct}%</span>
      </div>
      <div className="h-2 w-full rounded-full bg-sp-border overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
