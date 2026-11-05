"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { AlertCircle, RefreshCw, LayoutDashboard } from "lucide-react";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("App Portal Error Boundary caught:", error.message, "Digest:", error.digest);
  }, [error]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-xl p-8 text-center space-y-6">
        <div className="w-16 h-16 rounded-full bg-red-50 dark:bg-red-950/50 text-[#8b1a2b] flex items-center justify-center mx-auto border border-red-200 dark:border-red-900/50">
          <AlertCircle className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h1 className="font-serif text-xl sm:text-2xl font-bold text-stone-900 dark:text-stone-100">
            माहिती लोड करताना अडचण आली
          </h1>
          <p className="text-sm font-semibold text-stone-600 dark:text-stone-400">
            Error loading portal records.
          </p>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-2">
            कृपया पृष्ठ पुन्हा लोड करा किंवा डॅशबोर्डवर परत जा.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            onClick={() => reset()}
            className="flex-1 py-3 px-4 rounded-xl bg-[#8b1a2b] text-white font-bold text-sm shadow hover:bg-[#6d1320] transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            <span>पुन्हा प्रयत्न करा (Retry)</span>
          </button>
          <Link
            href="/app"
            className="flex-1 py-3 px-4 rounded-xl border border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-300 font-bold text-sm hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors flex items-center justify-center gap-2"
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>डॅशबोर्ड (Dashboard)</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

