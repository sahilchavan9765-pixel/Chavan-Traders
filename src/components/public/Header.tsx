"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useLanguage } from "@/context/LanguageContext";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { Menu, X, Phone, MessageSquare, LogIn, Globe } from "lucide-react";

export function Header() {
  const { locale, toggleLocale, t } = useLanguage();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { href: "/#home", targetId: "home", label: t.navHome },
    { href: "/#products", targetId: "products", label: t.navProducts },
    { href: "/#about", targetId: "about", label: t.navAbout },
    { href: "/#contact", targetId: "contact", label: t.navContact },
  ];

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, targetId: string) => {
    if (typeof window !== "undefined" && (window.location.pathname === "/" || window.location.pathname === "")) {
      e.preventDefault();
      const el = document.getElementById(targetId);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        window.history.pushState(null, "", `#${targetId}`);
      }
    }
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 bg-[#faf8f3]/95 dark:bg-[#121915]/95 backdrop-blur-md border-b border-[#ded8cb] dark:border-[#2e4135] transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo / Brand */}
          <Link
            href="/#home"
            onClick={(e) => handleNavClick(e, "home")}
            className="flex items-center gap-3 group"
          >
            <div className="w-12 h-12 rounded-full bg-[#8b1a2b] text-[#f8ecc4] flex items-center justify-center font-bold text-2xl shadow-md group-hover:scale-105 transition-transform">
              🌾
            </div>
            <div>
              <span
                suppressHydrationWarning
                className="block font-serif text-2xl sm:text-3xl font-extrabold text-[#8b1a2b] dark:text-[#f8ecc4] leading-tight tracking-tight"
              >
                {t.brandName}
              </span>
              <span
                suppressHydrationWarning
                className="block text-[11px] font-semibold tracking-[0.25em] text-[#1f4d33] dark:text-[#8fd6a8] uppercase"
              >
                {t.brandSub}
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => (
              <a
                key={link.targetId}
                href={link.href}
                onClick={(e) => handleNavClick(e, link.targetId)}
                className="text-[#1d1d1b] dark:text-[#f2ede2] hover:text-[#8b1a2b] dark:hover:text-[#f8ecc4] font-semibold text-base transition-colors cursor-pointer"
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* Desktop Action Buttons */}
          <div className="hidden lg:flex items-center gap-3">
            {/* Language Switcher */}
            <button
              onClick={toggleLocale}
              className="flex items-center gap-1.5 px-3 py-2 rounded-full border border-stone-300 dark:border-stone-700 bg-white dark:bg-[#1a251f] text-sm font-semibold hover:border-[#8b1a2b] transition-all shadow-sm cursor-pointer text-stone-800 dark:text-stone-200"
              title="Change Language"
              aria-label="Change Language"
            >
              <Globe className="w-4 h-4 text-[#8b1a2b] dark:text-[#f8ecc4]" />
              <span>{locale === "mr" ? "English" : "मराठी"}</span>
            </button>

            {/* Dark/Light/System Mode Toggle */}
            <ThemeToggle variant="icon" />

            {/* WhatsApp Link */}
            <a
              href="https://wa.me/919850815527?text=%E0%A4%A8%E0%A4%AE%E0%A4%B8%E0%A5%8D%E0%A4%95%E0%A4%BE%E0%A4%B0%20%E0%A4%9A%E0%A4%B5%E0%A5%8D%E0%A4%B9%E0%A4%BE%E0%A4%A3%20%E0%A4%9F%E0%A5%8D%E0%A4%B0%E0%A5%87%E0%A4%A1%E0%A4%B0%E0%A5%8D%E0%A4%B8%2C%20%E0%A4%AE%E0%A4%B2%E0%A4%BE%20%E0%A4%A7%E0%A4%BE%E0%A4%A8%E0%A5%8D%E0%A4%AF%E0%A4%BE%E0%A4%AC%E0%A4%A6%E0%A5%8D%E0%A4%A6%E0%A4%B2%20%E0%A4%AE%E0%A4%BE%E0%A4%B9%E0%A4%BF%E0%A4%A4%E0%A5%80%20%E0%A4%B9%E0%A4%B5%E0%A5%80%20%E0%A4%86%E0%A4%B9%E0%A5%87."
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#1f4d33] hover:bg-[#173b27] text-white font-semibold text-sm shadow-sm transition-all"
            >
              <MessageSquare className="w-4 h-4 text-[#8fd6a8]" />
              <span>{t.whatsappBtn}</span>
            </a>

            {/* Owner Login */}
            <Link
              href="/login"
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#8b1a2b] hover:bg-[#701522] text-white font-semibold text-sm shadow-sm transition-all"
            >
              <LogIn className="w-4 h-4" />
              <span>{t.loginBtn}</span>
            </Link>
          </div>

          {/* Mobile Right Controls: Lang + Theme + Hamburger */}
          <div className="flex items-center gap-2 md:hidden">
            <button
              onClick={toggleLocale}
              aria-label="Change language"
              className="px-2.5 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-[#1a251f] text-xs font-bold text-stone-800 dark:text-stone-200"
            >
              {locale === "mr" ? "EN" : "मराठी"}
            </button>
            <ThemeToggle variant="icon" />
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2.5 rounded-lg bg-[#8b1a2b] text-white shadow-sm cursor-pointer"
              aria-label="Open Menu"
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Dropdown Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-[#ded8cb] dark:border-[#2e4135] bg-[#faf8f3] dark:bg-[#121915] px-4 pt-3 pb-6 space-y-3 shadow-lg animate-in slide-in-from-top-4 duration-200">
          <div className="flex flex-col space-y-2">
            {navLinks.map((link) => (
              <a
                key={link.targetId}
                href={link.href}
                onClick={(e) => handleNavClick(e, link.targetId)}
                className="px-3 py-3 rounded-lg text-lg font-semibold text-[#1d1d1b] dark:text-[#f2ede2] hover:bg-stone-200/50 dark:hover:bg-stone-800/50 transition-colors cursor-pointer"
              >
                {link.label}
              </a>
            ))}
          </div>

          <div className="pt-3 border-t border-[#ded8cb] dark:border-[#2e4135] flex flex-col gap-2.5">
            <a
              href="tel:9765941078"
              className="flex items-center justify-center gap-2 py-3 rounded-xl border border-[#8b1a2b] text-[#8b1a2b] dark:text-[#f8ecc4] font-bold text-sm"
            >
              <Phone className="w-4 h-4" />
              <span>साहिल चव्हाण: 9765941078</span>
            </a>
            <a
              href="https://wa.me/919850815527"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 py-3 rounded-xl bg-[#1f4d33] text-white font-bold text-sm shadow-sm"
            >
              <MessageSquare className="w-4 h-4 text-[#8fd6a8]" />
              <span>तन्मय चव्हाण (WhatsApp): 9850815527</span>
            </a>
            <Link
              href="/login"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-center gap-2 py-3.5 rounded-xl bg-[#8b1a2b] text-white font-bold text-sm shadow-md"
            >
              <LogIn className="w-4 h-4" />
              <span>{t.loginBtn}</span>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
