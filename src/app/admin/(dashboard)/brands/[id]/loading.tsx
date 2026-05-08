import { Skeleton, TableSkeleton } from '@/features/admin/_shared/components/Skeleton';

export default function BrandDetailLoading(): React.ReactElement {
  return (
    <div className="space-y-5 max-w-[1200px]">
      <Skeleton variant="text" height="1rem" width="12rem" />
      <Skeleton variant="card" height="10rem" />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} variant="card" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="space-y-4">
          <Skeleton variant="card" height="8rem" />
          <Skeleton variant="card" height="8rem" />
        </div>
        <div className="lg:col-span-2 space-y-4">
          <TableSkeleton rows={4} columns={5} />
          <TableSkeleton rows={4} columns={4} />
        </div>
      </div>
    </div>
  );
}
