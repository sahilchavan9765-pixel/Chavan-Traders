"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";

export type Theme = "light" | "dark" | "system";

interface ThemeContextType {
  theme: Theme;
  resolvedTheme: "light" | "dark";
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: "system",
  resolvedTheme: "light",
  setTheme: () => {},
  toggleTheme: () => {},
});

const STORAGE_KEY = "ct_theme";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("system");
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">("light");

  // Read saved theme on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as Theme | null;
      if (saved && (saved === "light" || saved === "dark" || saved === "system")) {
        setThemeState(saved);
      }
    } catch {
      // localStorage may fail in restricted environments
    }
  }, []);

  const applyTheme = useCallback((targetTheme: Theme) => {
    if (typeof window === "undefined") return;

    const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const isDark =
      targetTheme === "dark" || (targetTheme === "system" && systemDark);

    const root = document.documentElement;
    if (isDark) {
      root.classList.add("dark");
      root.setAttribute("data-theme", "dark");
      setResolvedTheme("dark");
    } else {
      root.classList.remove("dark");
      root.setAttribute("data-theme", "light");
      setResolvedTheme("light");
    }
  }, []);

  // Apply whenever theme state changes
  useEffect(() => {
    applyTheme(theme);
  }, [theme, applyTheme]);

  // Listen to OS prefers-color-scheme changes when theme is system
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");

    const handleChange = () => {
      if (theme === "system") {
        applyTheme("system");
      }
    };

    if (mq.addEventListener) {
      mq.addEventListener("change", handleChange);
      return () => mq.removeEventListener("change", handleChange);
    } else {
      mq.addListener(handleChange);
      return () => mq.removeListener(handleChange);
    }
  }, [theme, applyTheme]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    try {
      localStorage.setItem(STORAGE_KEY, newTheme);
    } catch {
      // ignore storage errors
    }
  };

  const toggleTheme = () => {
    if (theme === "system") {
      setTheme("light");
    } else if (theme === "light") {
      setTheme("dark");
    } else {
      setTheme("system");
    }
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        resolvedTheme,
        setTheme,
        toggleTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

