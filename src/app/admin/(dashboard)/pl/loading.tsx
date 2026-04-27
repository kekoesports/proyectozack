import { Skeleton, TableSkeleton } from '@/components/admin/ui/Skeleton';

export default function PnLLoading(): React.ReactElement {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <Skeleton variant="text" height="2.5rem" width="10rem" />
          <Skeleton variant="text" width="14rem" />
        </div>
      </div>
      <Skeleton variant="card" height="5rem" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <Skeleton key={index} variant="card" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <TableSkeleton rows={6} columns={4} />
        </div>
        <Skeleton variant="card" height="20rem" />
      </div>
    </div>
  );
}
