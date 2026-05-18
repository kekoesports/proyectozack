import { Skeleton } from '@/features/admin/_shared/components/Skeleton';

export default function TalentProfileLoading(): React.ReactElement {
  return (
    <div className="space-y-5 max-w-[1200px]">

      {/* Breadcrumb */}
      <Skeleton variant="text" width="14rem" height="0.7rem" />

      {/* Header card */}
      <div className="rounded-xl bg-sp-admin-card overflow-hidden">
        <div className="h-28 w-full animate-pulse bg-sp-admin-border/40" />
        <div className="px-6 pb-6">
          <div className="flex items-end justify-between -mt-12 mb-4 flex-wrap gap-3">
            {/* Avatar */}
            <Skeleton variant="circle" width="5rem" height="5rem" />
            {/* Action buttons */}
            <div className="flex gap-2">
              <Skeleton variant="text" width="5rem" height="2rem" />
              <Skeleton variant="text" width="5rem" height="2rem" />
            </div>
          </div>
          {/* Name + role */}
          <div className="space-y-2 mb-4">
            <Skeleton variant="text" width="12rem" height="1.5rem" />
            <Skeleton variant="text" width="18rem" height="0.9rem" />
          </div>
          {/* Stats row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} variant="card" height="4rem" />
            ))}
          </div>
        </div>
      </div>

      {/* Socials + visibility row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Skeleton variant="card" height="10rem" />
        <Skeleton variant="card" height="10rem" />
      </div>

      {/* Campaigns + invoices */}
      <Skeleton variant="card" height="12rem" />
      <Skeleton variant="card" height="8rem" />
    </div>
  );
}
