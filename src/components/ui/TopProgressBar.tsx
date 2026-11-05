"use client";

import React, { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useLanguage } from "@/context/LanguageContext";
import { Database } from "lucide-react";

export function TopProgressBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { lang } = useLanguage();
  const isMr = lang === "mr";

  const [isNavigating, setIsNavigating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showColdStartNotice, setShowColdStartNotice] = useState(false);

  // When pathname or searchParams change, navigation has completed
  useEffect(() => {
    setIsNavigating(false);
    setProgress(100);
    setShowColdStartNotice(false);

    const timer = setTimeout(() => {
      setProgress(0);
    }, 300);

    return () => clearTimeout(timer);
  }, [pathname, searchParams]);

  // Intercept click on internal links to start progress immediately
  useEffect(() => {
    let coldStartTimer: NodeJS.Timeout | null = null;
    let progressInterval: NodeJS.Timeout | null = null;

    const handleAnchorClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest("a");
      if (!target || !target.href) return;

      const url = new URL(target.href, window.location.href);
      const isInternal = url.origin === window.location.origin;
      const isSamePath = url.pathname === window.location.pathname && url.search === window.location.search;
      const isNewTab = target.target === "_blank" || e.ctrlKey || e.metaKey || e.shiftKey;

      if (isInternal && !isSamePath && !isNewTab && !url.hash) {
        setIsNavigating(true);
        setProgress(20);

        // Incremental progress simulation
        progressInterval = setInterval(() => {
          setProgress((prev) => {
            if (prev >= 85) return prev;
            return prev + Math.random() * 15;
          });
        }, 200);

        // Neon cold start timer (>3 seconds)
        coldStartTimer = setTimeout(() => {
          setShowColdStartNotice(true);
        }, 3000);
      }
    };

    document.addEventListener("click", handleAnchorClick, { capture: true });

    return () => {
      document.removeEventListener("click", handleAnchorClick, { capture: true });
      if (progressInterval) clearInterval(progressInterval);
      if (coldStartTimer) clearTimeout(coldStartTimer);
    };
  }, []);

  if (!isNavigating && progress === 0) return null;

  return (
    <>
      {/* Top Thin Progress Bar */}
      <div
        className="fixed top-0 left-0 right-0 z-50 h-[3px] bg-transparent pointer-events-none"
        aria-hidden="true"
      >
        <div
          className="h-full bg-gradient-to-r from-[#8b1a2b] via-[#d9a850] to-[#1f4d33] transition-all duration-300 ease-out shadow-[0_0_8px_rgba(217,168,80,0.6)]"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Neon DB Cold Start Banner (>3s) */}
      {showColdStartNotice && (
        <aside
          role="status"
          aria-live="polite"
          className="fixed top-3 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 px-4 py-2.5 rounded-full bg-[#1a251f] text-white border border-[#d9a850]/40 shadow-2xl text-xs font-medium animate-in fade-in slide-in-from-top-2 duration-200"
        >
          <Database className="w-4 h-4 text-[#d9a850] animate-pulse" />
          <span>
            {isMr
              ? "डेटाबेस सुरू होत आहे, कृपया काही क्षण थांबा..."
              : "Waking up the database, please wait..."}
          </span>
        </aside>
      )}
    </>
  );
}

