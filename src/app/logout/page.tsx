"use client";

import { useEffect, useState } from "react";
import { signOut } from "next-auth/react";
import Link from "next/link";
import { LogOut, ArrowRight, CheckCircle2 } from "lucide-react";

export default function LogoutPage() {
  const [hasLoggedOut, setHasLoggedOut] = useState(false);

  useEffect(() => {
    const doLogout = async () => {
      try {
        await signOut({ redirect: false });
        setHasLoggedOut(true);
        // Short delay so user sees smooth feedback, then redirect to login
        setTimeout(() => {
          window.location.href = "/login?logged_out=1";
        }, 600);
      } catch (err) {
        console.error("Logout error:", err);
        window.location.href = "/login?logged_out=1";
      }
    };

    doLogout();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-[#8b1a2b] via-[#5d1420] to-[#26070c] text-white">
      <div className="w-full max-w-md bg-[#faf8f3] dark:bg-stone-900 text-stone-900 dark:text-stone-100 rounded-3xl p-8 sm:p-10 shadow-2xl border border-white/20 text-center animate-in fade-in zoom-in-95 duration-200">
        {/* Brand Icon */}
        <div className="w-16 h-16 rounded-2xl bg-red-100 dark:bg-red-950/50 text-[#8b1a2b] dark:text-[#f8ecc4] flex items-center justify-center mx-auto mb-4 shadow-sm">
          {hasLoggedOut ? (
            <CheckCircle2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
          ) : (
            <LogOut className="w-8 h-8 animate-pulse text-[#8b1a2b] dark:text-[#f8ecc4]" />
          )}
        </div>

        <h1 className="font-serif text-2xl font-bold text-[#8b1a2b] dark:text-[#f8ecc4]">
          {hasLoggedOut ? "लॉग आउट यशस्वी!" : "लॉग आउट होत आहे..."}
        </h1>
        <p className="text-sm text-stone-600 dark:text-stone-300 mt-1">
          {hasLoggedOut
            ? "Sign out complete. Redirecting to login..."
            : "Signing you out of Chavan Traders Portal..."}
        </p>

        <div className="my-6 py-4 px-3 rounded-2xl bg-stone-100 dark:bg-stone-800 text-xs text-stone-600 dark:text-stone-400 font-medium">
          🌾 चव्हाण ट्रेडर्स — धन्यवाद! पुन्हा भेट द्या.
        </div>

        <button
          onClick={() => {
            window.location.href = "/login?logged_out=1";
          }}
          className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-[#8b1a2b] hover:bg-[#701522] active:scale-[0.98] text-white font-bold text-sm shadow transition-all cursor-pointer"
        >
          <span>लॉगिन पानावर जा (Go to Login)</span>
          <ArrowRight className="w-4 h-4" />
        </button>

        <div className="mt-4">
          <Link
            href="/"
            className="text-xs text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 underline"
          >
            मुख्य वेबसाईट पहा (Back to Website)
          </Link>
        </div>
      </div>
    </div>
  );
}

