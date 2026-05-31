import { Skeleton, TableSkeleton } from '@/features/admin/_shared/components/Skeleton';

export default function AnalyticsLoading(): React.ReactElement {
  return (
    <div className="space-y-6">
      <Skeleton variant="text" height="1.75rem" width="12rem" />

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} variant="card" height="5rem" />
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Skeleton variant="card" height="14rem" />
        <Skeleton variant="card" height="14rem" />
      </div>

      {/* Campaigns table */}
      <div className="space-y-2">
        <Skeleton variant="text" height="1rem" width="8rem" />
        <TableSkeleton rows={6} columns={6} />
      </div>

      {/* Alerts + invoices */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} variant="card" height="3.5rem" />
          ))}
        </div>
        <div className="lg:col-span-2">
          <TableSkeleton rows={5} columns={5} />
        </div>
      </div>
    </div>
  );
}
