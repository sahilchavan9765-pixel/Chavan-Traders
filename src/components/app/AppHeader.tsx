"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { signOut } from "next-auth/react";
import {
  Wheat,
  LayoutDashboard,
  ShoppingCart,
  TrendingUp,
  Receipt,
  Boxes,
  PhoneCall,
  Mail,
  Settings,
  Users,
  LogOut,
  Globe,
  Store,
  ChevronDown,
  ShieldCheck,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";

interface AppHeaderProps {
  user: {
    email: string;
    name: string;
    role: string;
  };
}

export function AppHeader({ user }: AppHeaderProps) {
  const pathname = usePathname();
  const { lang, setLang } = useLanguage();
  const { theme, setTheme } = useTheme();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const navLinks = [
    { href: "/app", labelMr: "डॅशबोर्ड", labelEn: "Dashboard", icon: LayoutDashboard },
    { href: "/app/purchase", labelMr: "खरेदी", labelEn: "Purchase", icon: ShoppingCart },
    { href: "/app/sales", labelMr: "विक्री", labelEn: "Sale", icon: TrendingUp },
    { href: "/app/payments", labelMr: "जमा / खर्च", labelEn: "Payments", icon: Receipt },
    { href: "/app/stock", labelMr: "स्टॉक", labelEn: "Stock", icon: Boxes },
    { href: "/app/calls", labelMr: "कॉल्स", labelEn: "Calls", icon: PhoneCall },
    { href: "/app/enquiries", labelMr: "चौकशी", labelEn: "Enquiries", icon: Mail },
    { href: "/app/settings", labelMr: "सेटिंग्ज", labelEn: "Settings", icon: Settings },
  ];

  if (user.role === "admin") {
    navLinks.push({ href: "/app/users", labelMr: "युजर्स", labelEn: "Users", icon: Users });
  }

  const handleLogout = async () => {
    setIsLoggingOut(true);
    await signOut({ callbackUrl: "/login?logged_out=1" });
  };

  const getInitials = (name: string) => {
    if (!name) return "CT";
    const parts = name.trim().split(" ");
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-[#1a251f]/95 backdrop-blur border-b border-stone-200 dark:border-[#293a2f] shadow-xs print:hidden transition-colors">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-2">
          {/* Brand Logo (One single line, clean and crisp) */}
          <div className="flex items-center gap-2 shrink-0">
            <Link href="/app" className="flex items-center gap-2 group whitespace-nowrap">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-[#8b1a2b] to-[#1f4d33] flex items-center justify-center text-white shadow-xs group-hover:scale-105 transition-transform shrink-0">
                <Wheat className="w-4 h-4 sm:w-5 sm:h-5 text-[#f8ecc4]" />
              </div>
              <div className="leading-tight">
                <div className="font-serif font-bold text-base sm:text-lg text-[#8b1a2b] dark:text-[#f8ecc4] tracking-tight whitespace-nowrap">
                  {lang === "mr" ? "चव्हाण ट्रेडर्स" : "Chavan Traders"}
                </div>
                <div className="text-[10px] font-semibold text-[#1f4d33] dark:text-[#a3b899] tracking-wider uppercase whitespace-nowrap">
                  {lang === "mr" ? "व्यापारी पोर्टल" : "Owner Portal"}
                </div>
              </div>
            </Link>
          </div>

          {/* Navigation for Screens ≥ 1024px */}
          {/* 1. Icon-only Navigation for 1024px to 1279px */}
          <nav className="hidden lg:flex xl:hidden items-center gap-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              const title = lang === "mr" ? link.labelMr : link.labelEn;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  prefetch={false}
                  title={title}
                  aria-label={title}
                  className={`p-2 rounded-xl transition-colors relative group ${
                    isActive
                      ? "bg-[#8b1a2b] text-white shadow-xs"
                      : "text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800/70 hover:text-[#8b1a2b] dark:hover:text-[#f8ecc4]"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </Link>
              );
            })}
          </nav>

          {/* 2. Full Icon + Label Navigation for ≥ 1280px */}
          <nav className="hidden xl:flex items-center gap-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  prefetch={false}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-colors shrink-0 ${
                    isActive
                      ? "bg-[#8b1a2b] text-white shadow-xs"
                      : "text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800/70 hover:text-[#8b1a2b] dark:hover:text-[#f8ecc4]"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{lang === "mr" ? link.labelMr : link.labelEn}</span>
                </Link>
              );
            })}
          </nav>

          {/* Controls: Theme Toggle & User Menu */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Quick 1-click Theme Toggle on Desktop */}
            <div className="hidden sm:block">
              <ThemeToggle variant="icon" />
            </div>

            {/* User Menu Avatar */}
            <div className="relative shrink-0" ref={menuRef}>
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                aria-expanded={isMenuOpen}
                aria-label={lang === "mr" ? "वापरकर्ता मेनू" : "User menu"}
                className="flex items-center gap-2 p-1.5 sm:px-3 sm:py-1.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50/80 dark:bg-stone-800/60 hover:bg-stone-100 dark:hover:bg-stone-800 transition-all cursor-pointer shadow-xs"
              >
                {/* Avatar circle */}
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-tr from-[#8b1a2b] to-[#a7283c] text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
                  {getInitials(user.name)}
                </div>

                {/* Name & Role Text */}
                <div className="hidden sm:flex flex-col text-left leading-tight">
                  <span className="text-xs font-bold text-stone-900 dark:text-stone-100 max-w-[120px] truncate">
                    {user.name}
                  </span>
                  <span className="text-[10px] uppercase font-bold text-[#8b1a2b] dark:text-[#f8ecc4]">
                    {user.role}
                  </span>
                </div>

                <ChevronDown className="w-3.5 h-3.5 text-stone-400 dark:text-stone-400 ml-0.5" />
              </button>

              {/* Dropdown Menu */}
              {isMenuOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-[#1a251f] border border-stone-200 dark:border-[#293a2f] rounded-2xl shadow-xl py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                  {/* User Info Header */}
                  <div className="px-4 py-2.5 border-b border-stone-100 dark:border-stone-800">
                    <div className="text-xs text-stone-500 dark:text-stone-400 font-medium">
                      {lang === "mr" ? "लॉग इन युजर" : "Signed in as"}
                    </div>
                    <div className="font-bold text-sm text-stone-900 dark:text-stone-100 mt-0.5 truncate">
                      {user.name}
                    </div>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300">
                        <ShieldCheck className="w-3 h-3" />
                        {user.role.toUpperCase()}
                      </span>
                      <span className="text-xs text-stone-500 dark:text-stone-400 truncate max-w-[140px]">
                        {user.email}
                      </span>
                    </div>
                  </div>

                  <div className="py-1">
                    {/* Public Website */}
                    <Link
                      href="/"
                      target="_blank"
                      onClick={() => setIsMenuOpen(false)}
                      className="flex items-center justify-between px-4 py-2 text-xs text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <Store className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        <span>{lang === "mr" ? "वेबसाईट पहा" : "View Website"}</span>
                      </div>
                      <span className="text-[10px] text-stone-400 font-mono">↗</span>
                    </Link>

                    {/* Language Toggle */}
                    <button
                      onClick={() => {
                        setLang(lang === "mr" ? "en" : "mr");
                      }}
                      className="w-full flex items-center justify-between px-4 py-2 text-xs text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors cursor-pointer text-left"
                    >
                      <div className="flex items-center gap-2.5">
                        <Globe className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        <span>{lang === "mr" ? "भाषा (Language)" : "Language"}</span>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-stone-100 dark:bg-stone-800 text-[#8b1a2b] dark:text-[#f8ecc4]">
                        {lang === "mr" ? "मराठी" : "English"}
                      </span>
                    </button>

                    {/* Theme Mode Selector in Menu */}
                    <div className="px-4 py-2">
                      <div className="text-[11px] text-stone-500 dark:text-stone-400 font-semibold mb-1.5">
                        {lang === "mr" ? "थीम निवडा (Theme)" : "Select Theme"}
                      </div>
                      <ThemeToggle variant="segmented" className="w-full justify-between" />
                    </div>
                  </div>

                  {/* Logout Button */}
                  <div className="pt-1 border-t border-stone-100 dark:border-stone-800">
                    <button
                      onClick={handleLogout}
                      disabled={isLoggingOut}
                      className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer text-left disabled:opacity-50"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>
                        {isLoggingOut
                          ? lang === "mr"
                            ? "लॉग आउट होत आहे..."
                            : "Signing out..."
                          : lang === "mr"
                          ? "लॉग आउट करा (Logout)"
                          : "Sign Out"}
                      </span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
