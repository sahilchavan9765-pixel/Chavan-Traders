"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useLanguage } from "@/context/LanguageContext";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { Lock, Mail, ArrowLeft, LogIn, AlertCircle, CheckCircle2, UserCheck, Globe, Loader2 } from "lucide-react";

function LoginForm() {
  const { lang, setLang, t } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/app";
  const wasLoggedOut = searchParams.get("logged_out") === "1" || searchParams.get("logged_out") === "true";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleLogin = async (e?: React.FormEvent, customEmail?: string, customPass?: string) => {
    if (e) e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);

    const emailToUse = (customEmail || email).trim().toLowerCase();
    const passToUse = customPass || password;

    try {
      const res = await signIn("credentials", {
        redirect: false,
        email: emailToUse,
        password: passToUse,
        callbackUrl,
      });

      if (res?.error) {
        setErrorMsg(
          lang === "mr"
            ? "चुकीचा ईमेल किंवा पासवर्ड. कृपया पुन्हा प्रयत्न करा."
            : "Invalid email or password. Please try again."
        );
        setIsLoading(false);
      } else {
        router.push(callbackUrl);
        router.refresh();
      }
    } catch (err: any) {
      setErrorMsg(
        lang === "mr"
          ? "लॉगिन करताना अनपेक्षित त्रुटी आली."
          : "An unexpected error occurred during login."
      );
      setIsLoading(false);
    }
  };

  const selectUser = (selectedEmail: string, selectedPass: string) => {
    setEmail(selectedEmail);
    setPassword(selectedPass);
    setErrorMsg(null);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-[#8b1a2b] via-[#5d1420] to-[#26070c] text-white">
      <div className="w-full max-w-md bg-white dark:bg-[#1a251f] text-stone-900 dark:text-[#f2ede2] rounded-3xl p-6 sm:p-10 shadow-2xl border border-stone-200/40 dark:border-white/10 transition-colors">
        {/* Top Controls: Back Link + Theme + Language */}
        <div className="flex items-center justify-between gap-2 mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#8b1a2b] dark:text-[#f8ecc4] hover:underline"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{lang === "mr" ? "मुख्यपृष्ठ" : "Home"}</span>
          </Link>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setLang(lang === "mr" ? "en" : "mr")}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-700 dark:text-stone-300 text-xs font-semibold cursor-pointer"
              title="Change Language"
            >
              <Globe className="w-3.5 h-3.5 text-[#8b1a2b] dark:text-[#f8ecc4]" />
              <span>{lang === "mr" ? "EN" : "मराठी"}</span>
            </button>
            <ThemeToggle variant="icon" />
          </div>
        </div>

        {/* Brand header */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-[#8b1a2b] text-[#f8ecc4] flex items-center justify-center font-bold text-2xl mx-auto shadow-md mb-3">
            🌾
          </div>
          <h1 className="font-serif text-3xl font-extrabold text-[#8b1a2b] dark:text-[#f8ecc4]">
            {t.brandName}
          </h1>
          <p className="text-xs font-semibold tracking-widest text-[#1f4d33] dark:text-[#8fd6a8] uppercase mt-0.5">
            {t.brandSub}
          </p>
          <p className="text-xs text-stone-600 dark:text-stone-400 mt-2">
            {lang === "mr" ? "अधिकृत व्यापारी पोर्टल लॉगिन" : "Owner Business Portal Login"}
          </p>
        </div>

        {/* Logout success badge */}
        {wasLoggedOut && !errorMsg && (
          <div className="mb-5 p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 text-xs flex items-center gap-2.5 animate-in fade-in duration-200">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span>
              {lang === "mr"
                ? "आपण यशस्वीरित्या लॉग आउट झाला आहात. नवीन लॉगिन करा."
                : "Successfully signed out. Please sign in to continue."}
            </span>
          </div>
        )}

        {/* Error message */}
        {errorMsg && (
          <div className="mb-5 p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-300 dark:border-red-800 text-red-900 dark:text-red-200 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Quick select owner pills */}
        <div className="mb-5 p-3 rounded-2xl bg-stone-100 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700">
          <div className="text-[11px] font-bold text-stone-600 dark:text-stone-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <UserCheck className="w-3.5 h-3.5 text-[#8b1a2b] dark:text-[#f8ecc4]" />
            <span>{lang === "mr" ? "मालक लॉगिन निवडा (Quick Fill)" : "Select Owner Profile"}</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => selectUser("tanmaychavan@gmail.com", "Chavan@2026")}
              className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                email === "tanmaychavan@gmail.com"
                  ? "border-[#8b1a2b] bg-red-50 dark:bg-red-950/40 shadow-xs"
                  : "border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 hover:border-stone-400"
              }`}
            >
              <div className="font-bold text-xs text-stone-900 dark:text-stone-100">
                तन्मय चव्हाण
              </div>
              <div className="text-[10px] text-stone-600 dark:text-stone-400 truncate">
                tanmaychavan@gmail.com
              </div>
            </button>

            <button
              type="button"
              onClick={() => selectUser("sahilchavan9765@gmail.com", "Chavan@2026")}
              className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                email === "sahilchavan9765@gmail.com"
                  ? "border-[#8b1a2b] bg-red-50 dark:bg-red-950/40 shadow-xs"
                  : "border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 hover:border-stone-400"
              }`}
            >
              <div className="font-bold text-xs text-stone-900 dark:text-stone-100">
                साहिल चव्हाण
              </div>
              <div className="text-[10px] text-stone-600 dark:text-stone-400 truncate">
                sahilchavan9765@...
              </div>
            </button>
          </div>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 uppercase tracking-wider mb-1">
              {lang === "mr" ? "ईमेल आयडी" : "Email Address"}
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tanmaychavan@gmail.com"
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-[#8b1a2b]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 uppercase tracking-wider mb-1">
              {lang === "mr" ? "पासवर्ड" : "Password"}
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-[#8b1a2b]"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-[#8b1a2b] hover:bg-[#701522] active:scale-[0.99] text-white font-bold text-base shadow-md transition-all cursor-pointer disabled:opacity-50"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <LogIn className="w-4 h-4" />
            )}
            <span>
              {isLoading
                ? lang === "mr"
                  ? "लॉगिन होत आहे..."
                  : "Signing in..."
                : lang === "mr"
                ? "लॉगिन करा"
                : "Sign In"}
            </span>
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-stone-500 dark:text-stone-400">
          🔒 {lang === "mr" ? "फक्त अधिकृत मालकांसाठी सुरक्षित लॉगिन" : "Authorized Owner Access Only"}
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#8b1a2b] text-white text-sm">
          Loading...
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
