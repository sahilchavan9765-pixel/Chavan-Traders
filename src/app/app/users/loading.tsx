import { Skeleton } from "@/components/ui/Skeleton";

export default function UsersLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-150">
      <div className="border-b border-stone-200 dark:border-stone-800 pb-5 space-y-2">
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="p-6 rounded-2xl bg-white dark:bg-[#1a251f] border border-stone-200 dark:border-[#293a2f] shadow-xs space-y-4">
          <Skeleton className="h-6 w-36" />
          <div className="space-y-3">
            <Skeleton className="h-10 w-full rounded-xl" />
            <Skeleton className="h-10 w-full rounded-xl" />
            <Skeleton className="h-10 w-full rounded-xl" />
            <Skeleton className="h-12 w-full rounded-xl" />
          </div>
        </div>

        <div className="lg:col-span-2 p-6 rounded-2xl bg-white dark:bg-[#1a251f] border border-stone-200 dark:border-[#293a2f] shadow-xs space-y-4">
          <Skeleton className="h-6 w-44" />
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex justify-between items-center py-3 border-b border-stone-100 dark:border-stone-800">
                <div className="space-y-1">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-44" />
                </div>
                <div className="flex gap-2">
                  <Skeleton className="h-8 w-16 rounded-lg" />
                  <Skeleton className="h-8 w-16 rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

