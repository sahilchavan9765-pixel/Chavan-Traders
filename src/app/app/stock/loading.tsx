import { Skeleton } from "@/components/ui/Skeleton";

export default function StockLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-150">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-stone-200 dark:border-stone-800 pb-5 gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96 max-w-full" />
        </div>
        <Skeleton className="h-10 w-44 rounded-xl" />
      </div>

      {/* Top 2 Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <Skeleton className="h-32 rounded-2xl" />
        <Skeleton className="h-32 rounded-2xl" />
      </div>

      {/* Commodity Table Skeleton */}
      <div className="p-6 rounded-2xl bg-white dark:bg-[#1a251f] border border-stone-200 dark:border-[#293a2f] shadow-xs space-y-4">
        <Skeleton className="h-6 w-56" />
        <div className="space-y-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex justify-between items-center py-2.5 border-b border-stone-100 dark:border-stone-800">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-28" />
            </div>
          ))}
        </div>
      </div>

      {/* Ledger Table Skeleton */}
      <div className="p-6 rounded-2xl bg-white dark:bg-[#1a251f] border border-stone-200 dark:border-[#293a2f] shadow-xs space-y-4">
        <div className="flex justify-between items-center">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-9 w-64 rounded-xl" />
        </div>
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex justify-between items-center py-2.5 border-b border-stone-100 dark:border-stone-800">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-24" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

