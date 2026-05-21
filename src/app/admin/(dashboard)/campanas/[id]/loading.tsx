import { Skeleton, TableSkeleton } from '@/features/admin/_shared/components/Skeleton';

export default function CampaignDetailLoading(): React.ReactElement {
  return (
    <div className="space-y-5 max-w-[1200px]">
      {/* Breadcrumb + título */}
      <Skeleton variant="text" height="1rem" width="8rem" />
      <div className="space-y-1">
        <Skeleton variant="text" height="1.5rem" width="16rem" />
        <Skeleton variant="text" height="0.875rem" width="10rem" />
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} variant="card" />
        ))}
      </div>

      {/* Tabs + contenido principal */}
      <div className="space-y-4">
        {/* Tab bar */}
        <div className="flex gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} variant="text" height="2rem" width="5rem" />
          ))}
        </div>
        {/* Tab body */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="space-y-4">
            <Skeleton variant="card" height="8rem" />
            <Skeleton variant="card" height="8rem" />
          </div>
          <div className="lg:col-span-2 space-y-4">
            <TableSkeleton rows={5} columns={5} />
            <TableSkeleton rows={3} columns={4} />
          </div>
        </div>
      </div>
    </div>
  );
}
