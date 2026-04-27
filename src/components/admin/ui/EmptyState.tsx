import type { ReactNode } from 'react';

type Props = {
  readonly icon?: ReactNode;
  readonly title: string;
  readonly description?: string;
  readonly action?: ReactNode;
  readonly variant?: 'no-data' | 'no-results';
};

export function EmptyState({
  icon,
  title,
  description,
  action,
  variant = 'no-data',
}: Props): React.ReactElement {
  return (
    <div
      className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center"
      data-variant={variant}
    >
      {icon !== undefined && (
        <div
          className="flex items-center justify-center text-sp-admin-muted"
          style={{ width: 40, height: 40 }}
          aria-hidden="true"
        >
          {icon}
        </div>
      )}
      <p className="text-sm font-bold text-sp-admin-text">{title}</p>
      {description !== undefined && (
        <p className="max-w-xs text-xs text-sp-admin-muted">{description}</p>
      )}
      {action !== undefined && <div className="mt-2">{action}</div>}
    </div>
  );
}
