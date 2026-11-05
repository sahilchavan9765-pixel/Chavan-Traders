import { Skeleton } from "@/components/ui/Skeleton";

export default function DashboardLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-150">
      {/* Hero Welcome Banner Skeleton */}
      <div className="h-32 sm:h-36 rounded-2xl bg-gradient-to-r from-stone-200 via-stone-300 to-stone-200 dark:from-stone-900 dark:via-stone-800 dark:to-stone-900 motion-safe:animate-pulse p-6 flex flex-col justify-between" />

      {/* 6 Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="p-5 rounded-2xl bg-white dark:bg-[#1a251f] border border-stone-200 dark:border-[#293a2f] shadow-xs space-y-3"
          >
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-8 w-8 rounded-lg" />
            </div>
            <Skeleton className="h-8 w-28" />
            <Skeleton className="h-3 w-40" />
          </div>
        ))}
      </div>

      {/* 2-column: Recent Bills & Call Reminders */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 p-6 rounded-2xl bg-white dark:bg-[#1a251f] border border-stone-200 dark:border-[#293a2f] shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-16" />
          </div>
          <div className="space-y-3 pt-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-stone-100 dark:border-stone-800">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-6 w-16 rounded-md" />
              </div>
            ))}
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-white dark:bg-[#1a251f] border border-stone-200 dark:border-[#293a2f] shadow-xs space-y-4">
          <Skeleton className="h-6 w-36" />
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="p-3 rounded-xl border border-stone-100 dark:border-stone-800 space-y-2">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-3 w-40" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

