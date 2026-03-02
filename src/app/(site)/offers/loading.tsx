import Skeleton from "@/components/ui/Skeleton";

export default function OffersLoading() {
  return (
    <div className="flex flex-col gap-5 px-4 pt-4">
      <Skeleton className="h-8 w-24" />
      <Skeleton className="h-5 w-56" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-64 w-full rounded-[18px]" />
        ))}
      </div>
    </div>
  );
}
