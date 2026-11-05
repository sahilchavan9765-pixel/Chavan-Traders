import React from "react";
import Link from "next/link";
import { Search, Home, LayoutDashboard } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#faf8f3] dark:bg-stone-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-xl p-8 text-center space-y-6">
        <div className="w-16 h-16 rounded-full bg-amber-50 dark:bg-amber-950/50 text-[#8b1a2b] flex items-center justify-center mx-auto border border-amber-200 dark:border-amber-900/50">
          <Search className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <span className="text-4xl font-extrabold font-serif text-[#8b1a2b]">404</span>
          <h1 className="font-serif text-xl sm:text-2xl font-bold text-stone-900 dark:text-stone-100">
            पृष्ठ सापडले नाही
          </h1>
          <p className="text-sm font-semibold text-stone-600 dark:text-stone-400">
            Page Not Found
          </p>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-2">
            तुम्ही शोधत असलेले पान अस्तित्वात नाही किंवा लिंक बदलली आहे.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <Link
            href="/"
            className="flex-1 py-3 px-4 rounded-xl bg-[#8b1a2b] text-white font-bold text-sm shadow hover:bg-[#6d1320] transition-colors flex items-center justify-center gap-2"
          >
            <Home className="w-4 h-4" />
            <span>मुख्य पृष्ठ (Home)</span>
          </Link>
          <Link
            href="/app"
            className="flex-1 py-3 px-4 rounded-xl border border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-300 font-bold text-sm hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors flex items-center justify-center gap-2"
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>डॅशबोर्ड (Portal)</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

