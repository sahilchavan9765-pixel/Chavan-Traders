"use client";

import React, { useState, useRef, useEffect } from "react";
import { useTheme, Theme } from "@/context/ThemeContext";
import { useLanguage } from "@/context/LanguageContext";
import { Sun, Moon, Laptop, ChevronDown, Check } from "lucide-react";

interface ThemeToggleProps {
  variant?: "icon" | "segmented" | "menu";
  className?: string;
}

export function ThemeToggle({ variant = "icon", className = "" }: ThemeToggleProps) {
  const { theme, resolvedTheme, setTheme, toggleTheme } = useTheme();
  const { lang } = useLanguage();
  const isMr = lang === "mr";
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  const labels: Record<Theme, { mr: string; en: string }> = {
    light: { mr: "प्रकाश (Light)", en: "Light" },
    dark: { mr: "काळोख (Dark)", en: "Dark" },
    system: { mr: "सिस्टम (System)", en: "System" },
  };

  const currentIcon = () => {
    if (theme === "system") {
      return <Laptop className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />;
    }
    if (resolvedTheme === "dark") {
      return <Moon className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />;
    }
    return <Sun className="w-4 h-4 text-amber-500" />;
  };

  const getAriaLabel = () => {
    return isMr
      ? `थीम बदला. चालू थीम: ${labels[theme].mr}`
      : `Switch theme. Current theme: ${labels[theme].en}`;
  };

  // 1. Segmented Control (great for mobile sheets and settings)
  if (variant === "segmented") {
    const options: { id: Theme; icon: typeof Sun }[] = [
      { id: "light", icon: Sun },
      { id: "dark", icon: Moon },
      { id: "system", icon: Laptop },
    ];

    return (
      <div
        className={`inline-flex items-center p-1 rounded-xl bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 ${className}`}
        role="group"
        aria-label={getAriaLabel()}
      >
        {options.map(({ id, icon: Icon }) => {
          const isActive = theme === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setTheme(id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                isActive
                  ? "bg-white dark:bg-stone-900 text-[#8b1a2b] dark:text-[#f8ecc4] shadow-xs"
                  : "text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{isMr ? labels[id].mr.split(" ")[0] : labels[id].en}</span>
            </button>
          );
        })}
      </div>
    );
  }

  // 2. Dropdown Menu Variant
  if (variant === "menu") {
    return (
      <div className={`relative inline-block ${className}`} ref={menuRef}>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 hover:bg-stone-50 dark:hover:bg-stone-800 text-stone-800 dark:text-stone-200 text-xs font-semibold shadow-xs cursor-pointer transition-colors"
          aria-label={getAriaLabel()}
          aria-expanded={isOpen}
        >
          {currentIcon()}
          <span>{isMr ? labels[theme].mr : labels[theme].en}</span>
          <ChevronDown className="w-3.5 h-3.5 text-stone-400" />
        </button>

        {isOpen && (
          <div className="absolute right-0 mt-1.5 w-44 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xl py-1 z-50 animate-in fade-in zoom-in-95 duration-150">
            {(["light", "dark", "system"] as Theme[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => {
                  setTheme(t);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-left transition-colors cursor-pointer ${
                  theme === t
                    ? "bg-[#8b1a2b]/10 text-[#8b1a2b] dark:text-[#f8ecc4] font-bold"
                    : "text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800"
                }`}
              >
                <div className="flex items-center gap-2">
                  {t === "light" && <Sun className="w-3.5 h-3.5 text-amber-500" />}
                  {t === "dark" && <Moon className="w-3.5 h-3.5 text-indigo-400" />}
                  {t === "system" && <Laptop className="w-3.5 h-3.5 text-emerald-500" />}
                  <span>{isMr ? labels[t].mr : labels[t].en}</span>
                </div>
                {theme === t && <Check className="w-3.5 h-3.5 text-[#8b1a2b] dark:text-[#f8ecc4]" />}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // 3. Compact Icon button (default) - cycles Light -> Dark -> System
  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`p-2 sm:p-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-white/90 dark:bg-stone-900/90 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-200 shadow-xs transition-all cursor-pointer relative group ${className}`}
      aria-label={getAriaLabel()}
      title={isMr ? `थीम: ${labels[theme].mr}` : `Theme: ${labels[theme].en}`}
    >
      {currentIcon()}
      <span className="sr-only">{getAriaLabel()}</span>
    </button>
  );
}

