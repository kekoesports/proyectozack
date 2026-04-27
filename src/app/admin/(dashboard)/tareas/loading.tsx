import { Skeleton, TableSkeleton } from '@/components/admin/ui/Skeleton';

export default function TasksLoading(): React.ReactElement {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton variant="text" height="2.5rem" width="10rem" />
        <Skeleton variant="text" width="20rem" />
      </div>
      <div className="flex gap-2">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} variant="row" width="6rem" />
        ))}
      </div>
      <TableSkeleton rows={5} columns={4} />
    </div>
  );
}
