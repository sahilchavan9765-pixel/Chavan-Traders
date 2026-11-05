"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/context/LanguageContext";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  ShoppingCart,
  TrendingUp,
  Receipt,
  Menu,
  Boxes,
  PhoneCall,
  Mail,
  Settings,
  Users,
  X,
  Store,
  LogOut,
  Globe,
} from "lucide-react";
import { useState, useEffect } from "react";

interface AppBottomNavProps {
  userRole: string;
}

export function AppBottomNav({ userRole }: AppBottomNavProps) {
  const pathname = usePathname();
  const { lang, setLang } = useLanguage();
  const isMr = lang === "mr";
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  // Close sheet on route change
  useEffect(() => {
    setIsMoreOpen(false);
  }, [pathname]);

  // Handle ESC key to close sheet
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isMoreOpen) {
        setIsMoreOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isMoreOpen]);

  const mainTabs = [
    { href: "/app", labelMr: "डॅशबोर्ड", labelEn: "Home", icon: LayoutDashboard },
    { href: "/app/purchase", labelMr: "खरेदी", labelEn: "Purchase", icon: ShoppingCart },
    { href: "/app/sales", labelMr: "विक्री", labelEn: "Sales", icon: TrendingUp },
    { href: "/app/payments", labelMr: "जमा/खर्च", labelEn: "Ledger", icon: Receipt },
  ];

  const moreLinks = [
    { href: "/app/stock", labelMr: "स्टॉक आणि गोदाम", labelEn: "Stock / Inventory", icon: Boxes },
    { href: "/app/calls", labelMr: "कॉल्स व रिमाइंडर्स", labelEn: "Call Reminders", icon: PhoneCall },
    { href: "/app/enquiries", labelMr: "वेबसाईट चौकशी", labelEn: "Enquiries Inbox", icon: Mail },
    { href: "/app/settings", labelMr: "सेटिंग्ज आणि बॅकअप", labelEn: "Settings & Backup", icon: Settings },
  ];

  if (userRole === "admin") {
    moreLinks.push({ href: "/app/users", labelMr: "स्टाफ युजर्स", labelEn: "Staff Users", icon: Users });
  }

  const isMoreActive = moreLinks.some((l) => pathname === l.href);

  return (
    <>
      {/* Mobile Bottom Navigation Bar */}
      <nav
        aria-label="Mobile Bottom Navigation"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#1a251f]/95 backdrop-blur border-t border-stone-200 dark:border-[#293a2f] pb-[env(safe-area-inset-bottom)] shadow-[0_-2px_10px_rgba(0,0,0,0.05)] print:hidden transition-colors"
      >
        <div className="grid grid-cols-5 h-16">
          {mainTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = pathname === tab.href;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                prefetch={false}
                aria-label={isMr ? tab.labelMr : tab.labelEn}
                className={`flex flex-col items-center justify-center min-h-[44px] transition-colors ${
                  isActive
                    ? "text-[#8b1a2b] dark:text-[#f8ecc4] font-semibold"
                    : "text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-200"
                }`}
              >
                <div
                  className={`relative p-1 rounded-full ${
                    isActive ? "bg-red-50 dark:bg-stone-800/80" : ""
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {isActive && (
                    <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-4 h-1 bg-[#8b1a2b] dark:bg-[#f8ecc4] rounded-full" />
                  )}
                </div>
                <span className="text-[11px] mt-0.5 tracking-tight">
                  {isMr ? tab.labelMr : tab.labelEn}
                </span>
              </Link>
            );
          })}

          {/* More Sheet Trigger */}
          <button
            onClick={() => setIsMoreOpen(true)}
            aria-expanded={isMoreOpen}
            aria-label={isMr ? "अधिक पर्याय उघडा" : "Open more menu"}
            className={`flex flex-col items-center justify-center min-h-[44px] transition-colors cursor-pointer ${
              isMoreActive || isMoreOpen
                ? "text-[#8b1a2b] dark:text-[#f8ecc4] font-semibold"
                : "text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-200"
            }`}
          >
            <div
              className={`p-1 rounded-full ${
                isMoreActive ? "bg-red-50 dark:bg-stone-800/80" : ""
              }`}
            >
              <Menu className="w-5 h-5" />
            </div>
            <span className="text-[11px] mt-0.5 tracking-tight">
              {isMr ? "अधिक" : "More"}
            </span>
          </button>
        </div>
      </nav>

      {/* More Slide-over / Sheet */}
      {isMoreOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={() => setIsMoreOpen(false)}
          />

          {/* Drawer content */}
          <div className="fixed bottom-0 left-0 right-0 max-h-[85vh] bg-white dark:bg-[#1a251f] rounded-t-3xl shadow-2xl p-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] overflow-y-auto animate-in slide-in-from-bottom duration-200 border-t border-stone-200 dark:border-[#293a2f]">
            <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 pb-3 mb-4">
              <h3 className="font-serif font-bold text-lg text-stone-900 dark:text-stone-100">
                {isMr ? "अधिक पर्याय" : "More Options"}
              </h3>
              <button
                onClick={() => setIsMoreOpen(false)}
                aria-label={isMr ? "बंद करा" : "Close menu"}
                className="p-1.5 rounded-lg text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Links Grid */}
            <div className="grid grid-cols-2 gap-3">
              {moreLinks.map((link) => {
                const Icon = link.icon;
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    prefetch={false}
                    onClick={() => setIsMoreOpen(false)}
                    className={`flex items-center gap-3 p-3.5 rounded-xl border text-sm font-medium transition-colors ${
                      isActive
                        ? "border-[#8b1a2b] bg-red-50/70 dark:bg-red-950/30 text-[#8b1a2b] dark:text-[#f8ecc4]"
                        : "border-stone-200 dark:border-stone-800 text-stone-800 dark:text-stone-200 hover:border-stone-300 dark:hover:border-stone-700 bg-stone-50/50 dark:bg-stone-800/40"
                    }`}
                  >
                    <div className="p-2 rounded-lg bg-stone-100 dark:bg-stone-800 text-[#8b1a2b] dark:text-[#f8ecc4] shrink-0">
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="leading-tight">{isMr ? link.labelMr : link.labelEn}</span>
                  </Link>
                );
              })}
            </div>

            {/* Preferences (Theme & Language) Section */}
            <div className="mt-5 p-3.5 rounded-2xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700/80 space-y-3">
              {/* Theme Toggle */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-stone-700 dark:text-stone-300">
                  {isMr ? "थीम (Theme)" : "Theme"}
                </span>
                <ThemeToggle variant="segmented" />
              </div>

              {/* Language Toggle */}
              <div className="flex items-center justify-between pt-2 border-t border-stone-200 dark:border-stone-700">
                <div className="flex items-center gap-2 text-xs font-bold text-stone-700 dark:text-stone-300">
                  <Globe className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span>{isMr ? "भाषा (Language)" : "Language"}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setLang(lang === "mr" ? "en" : "mr")}
                  className="px-3 py-1.5 rounded-lg border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-900 text-xs font-bold text-[#8b1a2b] dark:text-[#f8ecc4] shadow-xs cursor-pointer"
                >
                  {isMr ? "English" : "मराठी"}
                </button>
              </div>
            </div>

            {/* Actions: View public site & Logout */}
            <div className="mt-4 pt-3 border-t border-stone-200 dark:border-stone-800 space-y-2.5">
              <Link
                href="/"
                target="_blank"
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 text-sm font-semibold text-stone-700 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors"
              >
                <Store className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>{isMr ? "पब्लिक वेबसाईट पहा" : "View Public Website"}</span>
              </Link>

              <button
                onClick={() => {
                  setIsMoreOpen(false);
                  signOut({ callbackUrl: "/login?logged_out=1" });
                }}
                className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-red-600 hover:bg-red-700 active:scale-[0.98] text-white font-bold text-sm shadow transition-all cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>{isMr ? "लॉग आउट (Sign Out)" : "Sign Out"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
