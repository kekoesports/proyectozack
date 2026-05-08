import { Skeleton, TableSkeleton } from '@/features/admin/_shared/components/Skeleton';

export default function AnalyticsLoading(): React.ReactElement {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton variant="text" height="2rem" width="10rem" />
        <Skeleton variant="text" height="1rem" width="18rem" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        {Array.from({ length: 10 }).map((_, i) => (
          <Skeleton key={i} variant="card" />
        ))}
      </div>
      <Skeleton variant="card" height="14rem" />
      <TableSkeleton rows={5} columns={6} />
    </div>
  );
}
