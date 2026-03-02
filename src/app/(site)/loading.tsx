import Skeleton from "@/components/ui/Skeleton";

export default function HomeLoading() {
  return (
    <div className="flex flex-col gap-6 px-4 pt-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-10 w-10 rounded-full" />
      </div>
      <Skeleton className="h-48 w-full rounded-[24px]" />
      <Skeleton className="h-12 w-full rounded-[18px]" />
      <div className="flex gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-20 rounded-full" />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-52 w-full rounded-[18px]" />
        ))}
      </div>
    </div>
  );
}
