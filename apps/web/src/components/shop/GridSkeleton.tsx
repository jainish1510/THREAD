import { Skeleton } from "../ui/States";

export function GridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="container-x pt-12 md:pt-16" aria-busy="true" aria-label="Loading products">
      <Skeleton className="h-12 w-64" />
      <Skeleton className="mt-4 h-4 w-20" />
      <div className="mt-24 grid grid-cols-2 gap-x-4 gap-y-14 md:grid-cols-3 md:gap-x-6 xl:grid-cols-4">
        {Array.from({ length: count }, (_, i) => (
          <div key={i}>
            <Skeleton className="aspect-[4/5] w-full" />
            <Skeleton className="mt-4 h-4 w-2/3" />
            <Skeleton className="mt-2 h-3 w-1/3" />
          </div>
        ))}
      </div>
    </div>
  );
}
