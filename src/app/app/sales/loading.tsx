import { Skeleton } from "@/components/ui/Skeleton";

export default function SalesLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-150">
      {/* Title */}
      <div className="border-b border-stone-200 dark:border-stone-800 pb-5 space-y-2">
        <Skeleton className="h-8 w-60" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>

      {/* Form Card Skeleton */}
      <div className="p-6 rounded-2xl bg-white dark:bg-[#1a251f] border border-stone-200 dark:border-[#293a2f] shadow-xs space-y-6">
        <Skeleton className="h-6 w-44" />

        {/* 3 Input fields */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Skeleton className="h-10 w-full rounded-xl" />
          <Skeleton className="h-10 w-full rounded-xl" />
          <Skeleton className="h-10 w-full rounded-xl" />
        </div>

        {/* Crop row */}
        <div className="p-4 rounded-xl border border-stone-200 dark:border-stone-800 space-y-3">
          <Skeleton className="h-5 w-32" />
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <Skeleton className="h-10 w-full rounded-xl" />
            <Skeleton className="h-10 w-full rounded-xl" />
            <Skeleton className="h-10 w-full rounded-xl" />
            <Skeleton className="h-10 w-full rounded-xl" />
          </div>
        </div>

        {/* Totals & Submit */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-4 border-t border-stone-100 dark:border-stone-800">
          <Skeleton className="h-10 w-48 rounded-xl" />
          <Skeleton className="h-12 w-40 rounded-xl" />
        </div>
      </div>

      {/* Recent Bills List */}
      <div className="p-6 rounded-2xl bg-white dark:bg-[#1a251f] border border-stone-200 dark:border-[#293a2f] shadow-xs space-y-4">
        <Skeleton className="h-6 w-40" />
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex justify-between items-center py-2.5 border-b border-stone-100 dark:border-stone-800">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-8 w-20 rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

