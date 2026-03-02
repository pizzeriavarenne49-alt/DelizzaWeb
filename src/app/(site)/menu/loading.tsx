import Skeleton from "@/components/ui/Skeleton";

export default function MenuLoading() {
  return (
    <div className="flex flex-col gap-5 px-4 pt-4">
      <Skeleton className="h-8 w-24" />
      <Skeleton className="h-12 w-full rounded-[18px]" />
      <div className="flex gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-20 rounded-full" />
        ))}
      </div>
      <Skeleton className="h-6 w-32" />
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-52 w-full rounded-[18px]" />
        ))}
      </div>
    </div>
  );
}
