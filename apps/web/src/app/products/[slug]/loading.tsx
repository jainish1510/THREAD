import { Skeleton } from "@/components/ui/States";

export default function ProductLoading() {
  return (
    <div className="container-x grid gap-10 pt-10 lg:grid-cols-[minmax(0,1.35fr)_minmax(360px,1fr)] lg:gap-16" aria-busy="true" aria-label="Loading product">
      <div className="grid grid-cols-2 gap-2">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="aspect-[4/5] w-full" />
        ))}
      </div>
      <div>
        <Skeleton className="h-9 w-2/3" />
        <Skeleton className="mt-3 h-6 w-16" />
        <Skeleton className="mt-10 h-4 w-1/2" />
        <Skeleton className="mt-2 h-4 w-1/3" />
        <Skeleton className="mt-10 h-8 w-48" />
        <Skeleton className="mt-10 h-12 w-full" />
        <Skeleton className="mt-8 h-14 w-full" />
      </div>
    </div>
  );
}
