import { Skeleton } from "@/components/ui/Skeleton";

export default function EnquiriesLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-in fade-in duration-150">
      <div className="flex justify-between items-center border-b border-stone-200 dark:border-stone-800 pb-5">
        <div className="space-y-2">
          <Skeleton className="h-8 w-72" />
          <Skeleton className="h-4 w-96 max-w-full" />
        </div>
        <Skeleton className="h-9 w-24 rounded-xl" />
      </div>

      <div className="flex justify-between items-center gap-3">
        <div className="flex gap-2">
          <Skeleton className="h-8 w-20 rounded-lg" />
          <Skeleton className="h-8 w-20 rounded-lg" />
          <Skeleton className="h-8 w-20 rounded-lg" />
        </div>
        <Skeleton className="h-10 w-64 rounded-xl" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="p-5 rounded-2xl bg-white dark:bg-[#1a251f] border border-stone-200 dark:border-[#293a2f] shadow-xs space-y-3"
          >
            <div className="flex justify-between items-center">
              <Skeleton className="h-5 w-28" />
              <Skeleton className="h-6 w-16 rounded-md" />
            </div>
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-12 w-full rounded-lg" />
            <div className="flex justify-between pt-2 border-t border-stone-100 dark:border-stone-800">
              <Skeleton className="h-8 w-24 rounded-lg" />
              <Skeleton className="h-8 w-8 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

