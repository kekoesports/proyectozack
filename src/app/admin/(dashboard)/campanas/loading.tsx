import { Skeleton, TableSkeleton } from '@/features/admin/_shared/components/Skeleton';

export default function CampaignsLoading(): React.ReactElement {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton variant="text" height="2.5rem" width="12rem" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} variant="card" />
        ))}
      </div>
      <TableSkeleton rows={6} columns={5} />
    </div>
  );
}
