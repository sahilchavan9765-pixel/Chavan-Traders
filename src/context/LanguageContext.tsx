"use client";

import React, { createContext, useContext, useState } from "react";
import { Locale, translations } from "@/lib/translations";

interface LanguageContextType {
  locale: Locale;
  lang: Locale;
  setLocale: (l: Locale) => void;
  setLang: (l: Locale) => void;
  t: typeof translations.mr;
  toggleLocale: () => void;
}

const LanguageContext = createContext<LanguageContextType>({
  locale: "mr",
  lang: "mr",
  setLocale: () => {},
  setLang: () => {},
  t: translations.mr,
  toggleLocale: () => {},
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("mr");

  React.useEffect(() => {
    try {
      const saved = localStorage.getItem("ct_locale") as Locale;
      if ((saved === "mr" || saved === "en") && saved !== "mr") {
        setLocaleState(saved);
        document.documentElement.lang = saved;
      }
    } catch {
      // ignore
    }
  }, []);

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);
    try {
      localStorage.setItem("ct_locale", newLocale);
      document.documentElement.lang = newLocale;
    } catch {
      // ignore
    }
  };

  const toggleLocale = () => {
    setLocale(locale === "mr" ? "en" : "mr");
  };

  const t = translations[locale];

  return (
    <LanguageContext.Provider
      value={{
        locale,
        lang: locale,
        setLocale,
        setLang: setLocale,
        t,
        toggleLocale,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
