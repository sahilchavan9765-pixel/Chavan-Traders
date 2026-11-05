import { Skeleton } from "@/components/ui/Skeleton";

export default function InvoiceLoading() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6 animate-in fade-in duration-150">
      {/* Action Bar Skeleton */}
      <div className="flex justify-between items-center">
        <Skeleton className="h-6 w-36" />
        <div className="flex gap-2">
          <Skeleton className="h-10 w-36 rounded-xl" />
          <Skeleton className="h-10 w-44 rounded-xl" />
        </div>
      </div>

      {/* Invoice Paper Skeleton */}
      <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-[#1a251f] shadow-md p-6 space-y-6">
        <div className="h-24 rounded-xl bg-stone-100 dark:bg-stone-800/60 p-4 space-y-2 flex flex-col items-center justify-center">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-3 w-64" />
        </div>

        <div className="grid grid-cols-2 gap-6 py-3 border-y border-stone-100 dark:border-stone-800">
          <div className="space-y-2">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-3 w-28" />
          </div>
          <div className="space-y-2 text-right">
            <Skeleton className="h-3 w-20 ml-auto" />
            <Skeleton className="h-5 w-32 ml-auto" />
            <Skeleton className="h-3 w-24 ml-auto" />
          </div>
        </div>

        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex justify-between py-2 border-b border-stone-50 dark:border-stone-800">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-24" />
            </div>
          ))}
        </div>

        <div className="flex justify-end pt-4">
          <div className="w-64 space-y-2">
            <div className="flex justify-between">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-16" />
            </div>
            <div className="flex justify-between">
              <Skeleton className="h-6 w-28" />
              <Skeleton className="h-6 w-24" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

