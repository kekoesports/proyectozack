export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-48 rounded-lg bg-sp-admin-hover" />
      <div className="grid grid-cols-4 gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-16 rounded-xl bg-sp-admin-hover" />
        ))}
      </div>
      <div className="h-48 rounded-xl bg-sp-admin-hover" />
      <div className="h-64 rounded-xl bg-sp-admin-hover" />
    </div>
  );
}
